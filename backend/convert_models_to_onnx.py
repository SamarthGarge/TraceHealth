"""
convert_models_to_onnx.py
Converts PyTorch .pt ResNet50 models to ONNX models with embedded
Class Activation Mapping (CAM / Grad-CAM).

For ResNet architectures with Global Average Pooling followed by Linear FC,
CAM is mathematically identical to Grad-CAM on layer4.
By embedding the 1x1 conv CAM computation into the forward pass,
ONNX Runtime can output genuine spatial localization heatmaps in a
single forward pass without needing PyTorch or backprop at inference time!

Usage:
    cd backend
    python convert_models_to_onnx.py
"""

import sys
import os

# Force UTF-8 stdout so torch's emoji in success messages don't crash on Windows cp1252
if sys.stdout.encoding != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8")
os.environ["PYTHONIOENCODING"] = "utf-8"

import logging
logging.getLogger("torch.onnx").setLevel(logging.ERROR)

import torch
import torch.nn as nn
import torch.nn.functional as F
from torchvision import models
from pathlib import Path

MODELS_DIR = Path(__file__).resolve().parent.parent / "models" / "vision"

MODELS = [
    {"pt": "tb_xray_model.pt",   "onnx": "tb_xray_model.onnx",   "num_classes": 2},
    {"pt": "cancer_ct_model.pt", "onnx": "cancer_ct_model.onnx", "num_classes": 3},
]


def build_resnet(num_classes: int) -> nn.Module:
    m = models.resnet50(weights=None)
    m.fc = nn.Linear(m.fc.in_features, num_classes)
    return m


class ResNetWithCAM(nn.Module):
    """
    Wraps a ResNet50 to output both logits and Class Activation Maps (CAM).
    Outputs:
      - logits: (batch, num_classes)
      - cam:    (batch, num_classes, 7, 7)
    """
    def __init__(self, base_model: nn.Module):
        super().__init__()
        self.base_model = base_model

    def forward(self, x: torch.Tensor):
        x = self.base_model.conv1(x)
        x = self.base_model.bn1(x)
        x = self.base_model.relu(x)
        x = self.base_model.maxpool(x)

        x = self.base_model.layer1(x)
        x = self.base_model.layer2(x)
        x = self.base_model.layer3(x)
        features = self.base_model.layer4(x)  # (batch, 2048, 7, 7)

        pooled = self.base_model.avgpool(features)
        flat = torch.flatten(pooled, 1)
        logits = self.base_model.fc(flat)     # (batch, num_classes)

        # 1x1 conv using the fc layer's weights
        # weight: (num_classes, 2048, 1, 1)
        weight = self.base_model.fc.weight.unsqueeze(-1).unsqueeze(-1)
        cam = F.conv2d(features, weight)      # (batch, num_classes, 7, 7)
        cam = F.relu(cam)

        return logits, cam


def convert(entry: dict):
    pt_path   = MODELS_DIR / entry["pt"]
    onnx_path = MODELS_DIR / entry["onnx"]

    if not pt_path.exists():
        print(f"  SKIP — {pt_path} not found")
        return

    print(f"  Loading {entry['pt']} ...")
    base_model = build_resnet(entry["num_classes"])
    state = torch.load(str(pt_path), map_location="cpu", weights_only=True)
    base_model.load_state_dict(state)
    base_model.eval()

    model = ResNetWithCAM(base_model)
    model.eval()

    # Dummy input (batch=1, RGB, 224x224)
    dummy = torch.zeros(1, 3, 224, 224)

    print(f"  Exporting to {entry['onnx']} (with CAM output) ...")
    torch.onnx.export(
        model,
        dummy,
        str(onnx_path),
        opset_version=18,
        input_names=["input"],
        output_names=["logits", "cam"],
        dynamic_axes={"input": {0: "batch"}, "logits": {0: "batch"}, "cam": {0: "batch"}},
        do_constant_folding=True,
        export_params=True,
    )
    size_mb = onnx_path.stat().st_size / (1024 ** 2)
    print(f"  Done: {onnx_path.name}  ({size_mb:.1f} MB)")


if __name__ == "__main__":
    print(f"Models dir: {MODELS_DIR}\n")
    for entry in MODELS:
        convert(entry)
    print("\nAll done.")
