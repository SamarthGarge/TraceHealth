"""
gradcam.py — Grad-CAM heatmap generation for vision model predictions.

All torch/grad-cam imports are deferred inside the function to avoid
Windows DLL initialisation errors at app startup.
"""

from io import BytesIO
import numpy as np
from PIL import Image
from pytorch_grad_cam import GradCAM
from pytorch_grad_cam.utils.image import show_cam_on_image
from pytorch_grad_cam.utils.model_targets import ClassifierOutputTarget

from app.utils.logging import get_logger

logger = get_logger(__name__)


def generate_gradcam(
    model,
    tensor,
    target_class: int,
    image_bytes: bytes,
    target_layer_attr: str = "layer4",
) -> bytes:
    """
    Generate a Grad-CAM overlay for the given model and input.

    Args:
        model:             The loaded PyTorch model (ResNet50).
        tensor:            Preprocessed (1, 3, 224, 224) tensor.
        target_class:      The class index to explain.
        image_bytes:       Original raw image bytes (used for overlay).
        target_layer_attr: Layer name on the model to hook (default: "layer4").

    Returns:
        PNG bytes of the heatmap overlay.
    """
    target_layer = getattr(model, target_layer_attr, None)
    if target_layer is None:
        raise ValueError(f"Model has no attribute '{target_layer_attr}'")

    targets = [ClassifierOutputTarget(target_class)]

    with GradCAM(model=model, target_layers=[target_layer]) as cam:
        grayscale_cam = cam(input_tensor=tensor, targets=targets)
        grayscale_cam = grayscale_cam[0]  # shape (224, 224)

    orig = Image.open(BytesIO(image_bytes)).convert("RGB").resize((224, 224))
    orig_np = np.array(orig).astype(np.float32) / 255.0

    overlay = show_cam_on_image(orig_np, grayscale_cam, use_rgb=True)
    overlay_img = Image.fromarray(overlay)

    buf = BytesIO()
    overlay_img.save(buf, format="PNG")
    buf.seek(0)
    return buf.read()
