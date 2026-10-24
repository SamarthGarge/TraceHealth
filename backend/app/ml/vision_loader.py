"""
vision_loader.py — PyTorch inference for vision models.

Loads the original .pt state_dict checkpoints and runs inference with
Grad-CAM via a hook on layer4 — the same ResNet50 fine-tuned models
that were trained in training/train_tb_image.py and train_cancer_image.py.

Models:
  - models/vision/tb_xray_model.pt    — ResNet50 binary  (0=Normal, 1=Tuberculosis)
  - models/vision/cancer_ct_model.pt  — ResNet50 3-class (0=Benign, 1=Malignant, 2=Normal)
"""

import gc
from contextlib import contextmanager
from io import BytesIO
from pathlib import Path

import numpy as np
from app.utils.logging import get_logger

logger = get_logger(__name__)

# ── Paths ─────────────────────────────────────────────────────────────────────

_MODELS_DIR = Path(__file__).resolve().parent.parent.parent.parent / "models" / "vision"

TB_MODEL_PATH        = _MODELS_DIR / "tb_xray_model.pt"
CANCER_CT_MODEL_PATH = _MODELS_DIR / "cancer_ct_model.pt"

# ── Class labels ──────────────────────────────────────────────────────────────

TB_CLASSES        = ["Normal", "Tuberculosis"]
CANCER_CT_CLASSES = ["Benign", "Malignant", "Normal"]

# ── ImageNet normalisation constants ─────────────────────────────────────────

_MEAN = np.array([0.485, 0.456, 0.406], dtype=np.float32).reshape(3, 1, 1)
_STD  = np.array([0.229, 0.224, 0.225], dtype=np.float32).reshape(3, 1, 1)


# ── Model loading ─────────────────────────────────────────────────────────────

def _load_pt_model(path: Path, num_classes: int):
    """
    Load a ResNet50 state_dict checkpoint from `path` and return the model in eval mode.
    """
    import torch
    import torch.nn as nn
    from torchvision import models

    if not path.exists():
        raise FileNotFoundError(
            f"PyTorch model not found: {path}\n"
            f"Run: cd training && python train_tb_image.py  (or train_cancer_image.py)"
        )

    logger.info("Loading PyTorch model: %s  (classes=%d)", path.name, num_classes)

    model = models.resnet50(weights=None)          # no pretrained weights — we load ours
    model.fc = nn.Linear(model.fc.in_features, num_classes)
    state = torch.load(str(path), map_location="cpu", weights_only=True)
    model.load_state_dict(state)
    model.eval()
    return model


def _unload_model(model) -> None:
    """Delete model and force GC to free RAM."""
    import torch
    del model
    gc.collect()
    if hasattr(torch, "cuda"):
        torch.cuda.empty_cache()
    logger.info("PyTorch model unloaded from memory")


# ── Context managers ──────────────────────────────────────────────────────────

@contextmanager
def _model_context(path: Path, num_classes: int):
    """Load → yield → unload a PyTorch model."""
    model = _load_pt_model(path, num_classes)
    try:
        yield model
    finally:
        _unload_model(model)


def tb_model_context():
    """Context manager: load, yield, and unload the TB ResNet50 model."""
    return _model_context(TB_MODEL_PATH, num_classes=2)


def cancer_model_context():
    """Context manager: load, yield, and unload the Cancer CT ResNet50 model."""
    return _model_context(CANCER_CT_MODEL_PATH, num_classes=3)


# ── Preprocessing ─────────────────────────────────────────────────────────────

def preprocess_image(image_bytes: bytes, target_size=(224, 224)) -> np.ndarray:
    """
    Convert raw image bytes to a normalised float32 array (1, 3, 224, 224).
    Pure numpy + Pillow — no additional dependency.
    """
    from PIL import Image

    img = Image.open(BytesIO(image_bytes)).convert("RGB").resize(target_size, Image.BILINEAR)
    arr = np.array(img, dtype=np.float32) / 255.0       # (224, 224, 3)  HWC
    arr = arr.transpose(2, 0, 1)                         # (3, 224, 224)  CHW
    arr = (arr - _MEAN) / _STD
    return arr[np.newaxis, :]                            # (1, 3, 224, 224)


# ── Inference ─────────────────────────────────────────────────────────────────

def run_inference(model, tensor: np.ndarray) -> tuple[int, list[float]]:
    """
    Run forward pass with the PyTorch model.
    Returns (predicted_class_index, softmax_probabilities).
    """
    import torch

    x = torch.from_numpy(tensor)          # (1, 3, 224, 224)
    with torch.no_grad():
        logits = model(x)                 # (1, num_classes)
    probs = torch.softmax(logits, dim=1)[0].tolist()
    pred  = int(torch.argmax(logits, dim=1).item())
    return pred, probs


# ── Grad-CAM ─────────────────────────────────────────────────────────────────

def generate_gradcam_onnx(
    model,
    tensor: np.ndarray,       # (1, 3, 224, 224) normalised float32
    target_class: int,
    image_bytes: bytes,
) -> bytes:
    """
    Generate a Grad-CAM heatmap overlay using PyTorch hooks on layer4.

    Despite the name keeping compatibility with the router, this now uses
    the native PyTorch model (not ONNX). Returns PNG bytes.
    """
    import torch
    from PIL import Image
    from scipy.ndimage import gaussian_filter

    x = torch.from_numpy(tensor).requires_grad_(False)

    # ── Register hooks to capture layer4 activations and gradients ──────────
    activations = {}
    gradients   = {}

    def save_activation(name):
        def hook(module, input, output):
            activations[name] = output
        return hook

    def save_gradient(name):
        def hook(module, grad_input, grad_output):
            gradients[name] = grad_output[0]
        return hook

    fwd_hook = model.layer4.register_forward_hook(save_activation("layer4"))
    bwd_hook = model.layer4.register_full_backward_hook(save_gradient("layer4"))

    try:
        # Forward pass (gradient tape needed)
        logits = model(x)                                  # (1, num_classes)

        # Backward pass for target class
        model.zero_grad()
        score = logits[0, target_class]
        score.backward()

        # Grad-CAM: global average pool gradients → weight activations
        grads  = gradients["layer4"]                       # (1, 2048, 7, 7)
        acts   = activations["layer4"].detach()            # (1, 2048, 7, 7)
        weights = grads.mean(dim=(2, 3), keepdim=True)     # (1, 2048, 1, 1)
        cam    = (weights * acts).sum(dim=1).squeeze()     # (7, 7)
        cam    = torch.relu(cam).numpy().astype(np.float32)
    finally:
        fwd_hook.remove()
        bwd_hook.remove()

    # Upsample (7,7) → (224,224)
    cam_img  = Image.fromarray(cam).resize((224, 224), Image.BICUBIC)
    saliency = np.array(cam_img, dtype=np.float32)

    # Smooth and normalise
    saliency = gaussian_filter(saliency, sigma=6)
    lo, hi   = float(saliency.min()), float(saliency.max())
    if hi > lo:
        saliency = (saliency - lo) / (hi - lo)
    else:
        saliency = np.zeros_like(saliency)

    # Overlay on original image
    orig    = Image.open(BytesIO(image_bytes)).convert("RGB").resize((224, 224))
    orig_np = np.array(orig, dtype=np.float32) / 255.0    # (224, 224, 3)

    heatmap = _jet_colormap(saliency)                      # (224, 224, 3)
    overlay = (0.55 * orig_np + 0.45 * heatmap).clip(0, 1)
    overlay = (overlay * 255).astype(np.uint8)

    buf = BytesIO()
    Image.fromarray(overlay).save(buf, format="PNG")
    buf.seek(0)
    return buf.read()


def _jet_colormap(v: np.ndarray) -> np.ndarray:
    """
    Map a (H, W) array in [0, 1] to (H, W, 3) float32 using the Jet palette:
    0.00 → Blue  |  0.25 → Cyan  |  0.50 → Green  |  0.75 → Yellow  |  1.00 → Red
    """
    v = np.clip(v, 0.0, 1.0)
    r = np.clip(np.where(v < 0.5, 0.0, (v - 0.5) * 4.0), 0.0, 1.0)
    g = np.clip(np.where(v < 0.25, v * 4.0, np.where(v < 0.75, 1.0, 1.0 - (v - 0.75) * 4.0)), 0.0, 1.0)
    b = np.clip(np.where(v < 0.25, 1.0, np.where(v < 0.5, 1.0 - (v - 0.25) * 4.0, 0.0)), 0.0, 1.0)
    return np.stack([r, g, b], axis=-1).astype(np.float32)
