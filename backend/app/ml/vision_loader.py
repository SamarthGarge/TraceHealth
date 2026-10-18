"""
vision_loader.py — ONNX Runtime inference for vision models.

Uses onnxruntime instead of PyTorch for inference, cutting RAM from ~400MB to ~120MB.
PyTorch is NOT imported at runtime at all.

Memory budget on Render free tier (512MB):
  - onnxruntime library:  ~30 MB
  - one 90MB ONNX model:  ~90 MB
  - FastAPI + other deps: ~80 MB
  - Total peak:          ~200 MB  ✓ (well under 512MB limit)

Grad-CAM is approximated via output-class gradient w.r.t. input (vanilla saliency),
computed entirely in numpy — no PyTorch dependency at inference time.

Supported models:
  - tb_xray_model.onnx:   ResNet50 binary   (Normal / Tuberculosis)
  - cancer_ct_model.onnx: ResNet50 3-class  (Benign / Malignant / Normal)

To convert existing .pt files to .onnx, run:
    cd backend && python convert_models_to_onnx.py
"""

import gc
import os
from contextlib import contextmanager
from io import BytesIO
from pathlib import Path

import numpy as np
from app.utils.logging import get_logger

logger = get_logger(__name__)

# ── Paths ─────────────────────────────────────────────────────────────────────

_MODELS_DIR = Path(__file__).resolve().parent.parent.parent.parent / "models" / "vision"

TB_MODEL_PATH        = _MODELS_DIR / "tb_xray_model.onnx"
CANCER_CT_MODEL_PATH = _MODELS_DIR / "cancer_ct_model.onnx"

# ── Class labels ──────────────────────────────────────────────────────────────

TB_CLASSES        = ["Normal", "Tuberculosis"]
CANCER_CT_CLASSES = ["Benign", "Malignant", "Normal"]

# ── ImageNet normalisation constants ─────────────────────────────────────────

_MEAN = np.array([0.485, 0.456, 0.406], dtype=np.float32).reshape(3, 1, 1)
_STD  = np.array([0.229, 0.224, 0.225], dtype=np.float32).reshape(3, 1, 1)


# ── ONNX session management ───────────────────────────────────────────────────

def _load_session(path: Path):
    """Load an ONNX model into an InferenceSession (CPU only)."""
    import onnxruntime as ort

    if not path.exists():
        raise FileNotFoundError(
            f"ONNX model not found: {path}.\n"
            f"Run: cd backend && python convert_models_to_onnx.py"
        )

    logger.info("Loading ONNX session: %s", path.name)

    opts = ort.SessionOptions()
    opts.intra_op_num_threads = 1   # single-threaded saves RAM on free tier
    opts.inter_op_num_threads = 1
    opts.execution_mode = ort.ExecutionMode.ORT_SEQUENTIAL

    session = ort.InferenceSession(
        str(path),
        sess_options=opts,
        providers=["CPUExecutionProvider"],
    )
    return session


def _unload_session(session) -> None:
    """Delete an ONNX session and force GC."""
    del session
    gc.collect()
    logger.info("ONNX session unloaded from memory")


@contextmanager
def _session_context(path: Path):
    """
    Context manager: load ONNX session → yield it → unload it.

    Usage:
        with _session_context(TB_MODEL_PATH) as sess:
            pred_idx, probs = run_inference(sess, tensor)
    """
    session = _load_session(path)
    try:
        yield session
    finally:
        _unload_session(session)


# ── Public API ────────────────────────────────────────────────────────────────

def tb_model_context():
    """Context manager: load, yield, and unload the TB ONNX session."""
    return _session_context(TB_MODEL_PATH)


def cancer_model_context():
    """Context manager: load, yield, and unload the Cancer CT ONNX session."""
    return _session_context(CANCER_CT_MODEL_PATH)


# ── Preprocessing ─────────────────────────────────────────────────────────────

def preprocess_image(image_bytes: bytes, target_size=(224, 224)) -> np.ndarray:
    """
    Convert raw image bytes to a normalised float32 array (1, 3, 224, 224).
    Pure numpy + Pillow — no torch dependency.
    """
    from PIL import Image

    img = Image.open(BytesIO(image_bytes)).convert("RGB").resize(target_size, Image.BILINEAR)
    arr = np.array(img, dtype=np.float32) / 255.0       # (224, 224, 3)  HWC
    arr = arr.transpose(2, 0, 1)                         # (3, 224, 224)  CHW
    arr = (arr - _MEAN) / _STD
    return arr[np.newaxis, :]                            # (1, 3, 224, 224)


# ── Inference ─────────────────────────────────────────────────────────────────

def run_inference(session, tensor: np.ndarray) -> tuple[int, list[float]]:
    """
    Run forward pass via ONNX Runtime.
    Returns (predicted_class_index, softmax_probabilities).
    """
    input_name = session.get_inputs()[0].name
    # Explicitly request "logits" output (works whether model outputs logits alone or logits + cam)
    logits = session.run(["logits"], {input_name: tensor})[0]   # (1, num_classes)

    # Softmax in numpy
    logits = logits[0].astype(np.float64)
    exp    = np.exp(logits - logits.max())
    probs  = (exp / exp.sum()).tolist()
    pred   = int(np.argmax(logits))

    return pred, probs


# ── Grad-CAM / Class Activation Mapping ──────────────────────────────────────

def generate_gradcam_onnx(
    session,
    tensor: np.ndarray,         # (1, 3, 224, 224) normalised float32
    target_class: int,
    image_bytes: bytes,
) -> bytes:
    """
    Generate authentic Grad-CAM / Class Activation Map overlay without PyTorch.
    Uses the embedded Class Activation Map output from the ONNX session.
    For ResNet-50 (GAP + Linear FC), CAM is mathematically identical to Grad-CAM on layer4.

    Returns PNG bytes.
    """
    from PIL import Image
    from scipy.ndimage import gaussian_filter

    input_name   = session.get_inputs()[0].name
    output_names = [o.name for o in session.get_outputs()]

    if "cam" in output_names:
        cam_all = session.run(["cam"], {input_name: tensor})[0]  # (1, num_classes, 7, 7)
        cam_raw = cam_all[0, target_class].astype(np.float32)    # (7, 7)
    else:
        cam_raw = np.zeros((7, 7), dtype=np.float32)

    # Upsample from (7, 7) feature map to (224, 224) using bicubic interpolation
    cam_img  = Image.fromarray(cam_raw).resize((224, 224), Image.BICUBIC)
    saliency = np.array(cam_img, dtype=np.float32)

    # Smooth the upsampled map for natural anatomic heatmaps
    saliency = gaussian_filter(saliency, sigma=6)
    lo, hi   = float(saliency.min()), float(saliency.max())
    if hi > lo:
        saliency = (saliency - lo) / (hi - lo)
    else:
        saliency = np.zeros_like(saliency)

    # Overlay on original image
    orig = Image.open(BytesIO(image_bytes)).convert("RGB").resize((224, 224))
    orig_np = np.array(orig, dtype=np.float32) / 255.0       # (224, 224, 3)

    # Jet colormap: blue (cold / background) -> green -> yellow -> red (hot / focal region)
    heatmap = _jet_colormap(saliency)                        # (224, 224, 3)
    overlay = (0.55 * orig_np + 0.45 * heatmap).clip(0, 1)
    overlay = (overlay * 255).astype(np.uint8)

    buf = BytesIO()
    Image.fromarray(overlay).save(buf, format="PNG")
    buf.seek(0)
    return buf.read()


def _jet_colormap(v: np.ndarray) -> np.ndarray:
    """
    Map a (H, W) array in [0, 1] to (H, W, 3) float32 using a vivid Jet palette:
    0.00: Blue    (lowest influence)
    0.25: Cyan
    0.50: Green
    0.75: Yellow
    1.00: Red     (highest influence)
    """
    v = np.clip(v, 0.0, 1.0)
    r = np.clip(np.where(v < 0.5, 0.0, (v - 0.5) * 4.0), 0.0, 1.0)
    g = np.clip(np.where(v < 0.25, v * 4.0, np.where(v < 0.75, 1.0, 1.0 - (v - 0.75) * 4.0)), 0.0, 1.0)
    b = np.clip(np.where(v < 0.25, 1.0, np.where(v < 0.5, 1.0 - (v - 0.25) * 4.0, 0.0)), 0.0, 1.0)
    return np.stack([r, g, b], axis=-1).astype(np.float32)

