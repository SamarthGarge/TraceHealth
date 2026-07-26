"""
vision_loader.py — Lazy singleton loader for PyTorch vision models.

All torch/torchvision imports are deferred inside functions to avoid
Windows DLL initialisation errors when the FastAPI app starts without
a CUDA-compatible GPU driver present.

Models are loaded from disk on first inference request, not at app startup.

Supported models:
  - tb_xray_model:   ResNet50 binary (TB / Normal)
  - cancer_ct_model: ResNet50 3-class (Benign / Malignant / Normal)
"""

from pathlib import Path
from app.config import settings
from app.utils.logging import get_logger

logger = get_logger(__name__)

# ── Windows DLL Fix ───────────────────────────────────────────────────────────

import os, site
# Python 3.8+ on Windows uses a restricted DLL search path.
# Uvicorn's async worker context doesn't inherit the standard PATH entries,
# causing WinError 1114 when torch tries to load c10.dll and its deps.
# Explicitly registering the torch lib directory fixes this.
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

# Resolve absolute path to models/vision regardless of CWD
_MODELS_DIR = Path(__file__).resolve().parent.parent.parent.parent / "models" / "vision"

TB_MODEL_PATH        = _MODELS_DIR / "tb_xray_model.pt"
CANCER_CT_MODEL_PATH = _MODELS_DIR / "cancer_ct_model.pt"

import torch
import torchvision.transforms as transforms
from torchvision.models import resnet50
from io import BytesIO
from PIL import Image

# ── Class labels ──────────────────────────────────────────────────────────────

TB_CLASSES        = ["Normal", "Tuberculosis"]
CANCER_CT_CLASSES = ["Benign", "Malignant", "Normal"]

# ── Model cache ───────────────────────────────────────────────────────────────

_cache: dict = {}


def _build_resnet(num_classes: int):
    """Build a ResNet50 with a replaced FC head — imports torch lazily."""
    import torch.nn as nn
    from torchvision import models
    m = models.resnet50(weights=None)
    m.fc = nn.Linear(m.fc.in_features, num_classes)
    return m


def _load(key: str, path: Path, num_classes: int):
    if key in _cache:
        return _cache[key]
    
    print(f"[DEBUG vision_loader] Attempting to load '{key}'")
    print(f"[DEBUG vision_loader] CWD is: {os.getcwd()}")
    print(f"[DEBUG vision_loader] Path evaluates to: {path}")
    print(f"[DEBUG vision_loader] path.resolve() is: {path.resolve()}")
    print(f"[DEBUG vision_loader] path.exists() is: {path.exists()}")

    if not path.exists():
        raise FileNotFoundError(
            f"Vision model not found: {path}. "
            f"Run training/train_{key}_image.py first to generate it."
        )
    model = _build_resnet(num_classes)
    state = torch.load(str(path), map_location="cpu", weights_only=True)
    model.load_state_dict(state)
    model.eval()
    _cache[key] = model
    logger.info("Loaded vision model: %s", path.name)
    return model


def get_tb_model():
    return _load("tb", TB_MODEL_PATH, num_classes=2)


def get_cancer_ct_model():
    return _load("cancer_ct", CANCER_CT_MODEL_PATH, num_classes=3)


# ── Preprocessing ─────────────────────────────────────────────────────────────

def preprocess_image(image_bytes: bytes, target_size=(224, 224)):
    """
    Convert raw image bytes to a normalised (1, 3, 224, 224) tensor.
    """
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
