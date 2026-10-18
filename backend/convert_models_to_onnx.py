"""
convert_models_to_onnx.py
Run this ONCE locally to convert the .pt models to .onnx format.

Usage:
    cd backend
    python convert_models_to_onnx.py

Requirements:
    - torch, torchvision must be installed (your local venv)
    - Writes tb_xray_model.onnx and cancer_ct_model.onnx next to the .pt files
"""

import sys
import os

# Force UTF-8 stdout so torch's emoji in success messages don't crash on Windows cp1252
if sys.stdout.encoding != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8")
os.environ["PYTHONIOENCODING"] = "utf-8"

import torch
import torch.nn as nn
from torchvision import models
from pathlib import Path

MODELS_DIR = Path(__file__).resolve().parent.parent / "models" / "vision"

MODELS = [
    {"pt": "tb_xray_model.pt",   "onnx": "tb_xray_model.onnx",   "num_classes": 2},
    {"pt": "cancer_ct_model.pt", "onnx": "cancer_ct_model.onnx", "num_classes": 3},
]


def build_resnet(num_classes: int):
    m = models.resnet50(weights=None)
    m.fc = nn.Linear(m.fc.in_features, num_classes)
    return m


def convert(entry: dict):
    pt_path   = MODELS_DIR / entry["pt"]
    onnx_path = MODELS_DIR / entry["onnx"]

    if not pt_path.exists():
        print(f"  SKIP — {pt_path} not found")
        return

    print(f"  Loading {entry['pt']} ...")
    model = build_resnet(entry["num_classes"])
    state = torch.load(str(pt_path), map_location="cpu", weights_only=True)
    model.load_state_dict(state)
    model.eval()

    # Dummy input (batch=1, RGB, 224×224)
    dummy = torch.zeros(1, 3, 224, 224)

    print(f"  Exporting to {entry['onnx']} ...")
    # Suppress verbose torch.onnx output to avoid emoji UnicodeEncodeError on Windows cp1252
    import logging
    logging.getLogger("torch.onnx").setLevel(logging.ERROR)

    torch.onnx.export(
        model,
        dummy,
        str(onnx_path),
        opset_version=11,
        input_names=["input"],
        output_names=["logits"],
        dynamic_axes={"input": {0: "batch"}, "logits": {0: "batch"}},
        do_constant_folding=True,
        export_params=True,
    )
    size_mb = onnx_path.stat().st_size / (1024 ** 2)
    print(f"  Done: {onnx_path.name}  ({size_mb:.1f} MB)")


if __name__ == "__main__":
    print(f"Models dir: {MODELS_DIR}\n")
    for entry in MODELS:
        convert(entry)
    print("\nAll done. Upload the .onnx files to your Render secret files or models/vision/.")
