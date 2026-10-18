"""
vision_loader.py — On-demand loader for PyTorch vision models.

Models are loaded from disk on each inference request, then immediately
unloaded (deleted + gc.collect) to keep RAM under Render's 512MB free-tier cap.

Two 90MB ResNet50 models cached simultaneously would push ~180MB of model weights
plus PyTorch's ~200MB library footprint over the limit.

Trade-off: ~3-5 seconds of load time per image prediction request.

Supported models:
  - tb_xray_model:   ResNet50 binary (TB / Normal)
  - cancer_ct_model: ResNet50 3-class (Benign / Malignant / Normal)
"""

import gc
import os
import site
from contextlib import contextmanager
from pathlib import Path

from app.config import settings
from app.utils.logging import get_logger

logger = get_logger(__name__)

# ── Windows DLL Fix ───────────────────────────────────────────────────────────
# Python 3.8+ on Windows uses a restricted DLL search path.
# Uvicorn's async worker context doesn't inherit the standard PATH entries,
# causing WinError 1114 when torch tries to load c10.dll and its deps.
if os.name == "nt":
    for sp in (site.getsitepackages() if hasattr(site, "getsitepackages") else []):
        torch_lib = os.path.join(sp, "torch", "lib")
        if os.path.isdir(torch_lib):
            try:
                os.add_dll_directory(torch_lib)
            except OSError:
                pass
            break

# ── Paths ─────────────────────────────────────────────────────────────────────

_MODELS_DIR = Path(__file__).resolve().parent.parent.parent.parent / "models" / "vision"

TB_MODEL_PATH        = _MODELS_DIR / "tb_xray_model.pt"
CANCER_CT_MODEL_PATH = _MODELS_DIR / "cancer_ct_model.pt"

# ── Class labels ──────────────────────────────────────────────────────────────

TB_CLASSES        = ["Normal", "Tuberculosis"]
CANCER_CT_CLASSES = ["Benign", "Malignant", "Normal"]


# ── Model building ────────────────────────────────────────────────────────────

def _build_resnet(num_classes: int):
    """Build a ResNet50 with a replaced FC head — imports torch lazily."""
    import torch.nn as nn
    from torchvision import models
    m = models.resnet50(weights=None)
    m.fc = nn.Linear(m.fc.in_features, num_classes)
    return m


def _load_model(path: Path, num_classes: int):
    """
    Load a model from disk into CPU memory.
    Caller is responsible for calling _unload_model() when done.
    """
    import torch

    if not path.exists():
        raise FileNotFoundError(
            f"Vision model not found: {path}. "
            f"Run the corresponding training script first."
        )

    logger.info("Loading vision model: %s", path.name)
    model = _build_resnet(num_classes)
    state = torch.load(str(path), map_location="cpu", weights_only=True)
    model.load_state_dict(state)
    model.eval()
    return model


def _unload_model(model) -> None:
    """
    Delete a model from Python memory and force garbage collection.
    This is critical on Render's free tier (512 MB RAM).
    """
    import torch
    del model
    gc.collect()
    # Clear any torch internal caches (no-op on CPU, but harmless)
    try:
        torch.cuda.empty_cache()
    except Exception:
        pass
    logger.info("Vision model unloaded from memory")


@contextmanager
def _model_context(path: Path, num_classes: int):
    """
    Context manager: load model → yield it → unload it.

    Usage:
        with _model_context(TB_MODEL_PATH, 2) as model:
            pred, probs = run_inference(model, tensor)
    """
    model = _load_model(path, num_classes)
    try:
        yield model
    finally:
        _unload_model(model)


# ── Public API ────────────────────────────────────────────────────────────────

def get_tb_model():
    """
    Load the TB model on demand (no persistent cache).
    Prefer using tb_model_context() to ensure automatic unload.
    """
    return _load_model(TB_MODEL_PATH, num_classes=2)


def get_cancer_ct_model():
    """
    Load the Cancer CT model on demand (no persistent cache).
    Prefer using cancer_model_context() to ensure automatic unload.
    """
    return _load_model(CANCER_CT_MODEL_PATH, num_classes=3)


def tb_model_context():
    """Context manager that loads, yields, and unloads the TB model."""
    return _model_context(TB_MODEL_PATH, num_classes=2)


def cancer_model_context():
    """Context manager that loads, yields, and unloads the Cancer CT model."""
    return _model_context(CANCER_CT_MODEL_PATH, num_classes=3)


# ── Preprocessing ─────────────────────────────────────────────────────────────

def preprocess_image(image_bytes: bytes, target_size=(224, 224)):
    """
    Convert raw image bytes to a normalised (1, 3, 224, 224) tensor.
    """
    import torchvision.transforms as transforms
    from io import BytesIO
    from PIL import Image

    transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize(
            mean=[0.485, 0.456, 0.406],
            std=[0.229, 0.224, 0.225],
        ),
    ])

    img = Image.open(BytesIO(image_bytes)).convert("RGB")
    return transform(img).unsqueeze(0)


# ── Inference ─────────────────────────────────────────────────────────────────

def run_inference(model, tensor) -> tuple[int, list[float]]:
    """Run forward pass and return (predicted_class_index, softmax_probs)."""
    import torch
    with torch.no_grad():
        logits = model(tensor)
        probs  = torch.softmax(logits, dim=1)[0].tolist()
        pred   = int(torch.argmax(logits, dim=1).item())
    return pred, probs
