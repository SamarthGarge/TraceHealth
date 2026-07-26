"""
train_tb_image.py — Train a ResNet50 binary classifier for TB chest X-ray detection.

Dataset layout expected:
  training/data/raw/images/tb_chest_xray/
    Normal/          (3500 images)
    Tuberculosis/    (700 images)

Output:
  models/vision/tb_xray_model.pt

Usage:
  cd training
  python train_tb_image.py [--epochs 20] [--batch-size 32] [--lr 1e-4]

Notes:
  - Uses class-weighted loss to handle the 5:1 Normal:TB imbalance
  - Transfer learning from ImageNet weights (torchvision.models.resnet50 IMAGENET1K_V2)
  - Fine-tunes the full network after unfreezing all layers at epoch 5
  - Saves the best val-AUC checkpoint
"""

import argparse
import sys
from pathlib import Path

import torch
import torch.nn as nn
from torch.utils.data import DataLoader, random_split
from torchvision import datasets, models, transforms
from sklearn.metrics import roc_auc_score
import numpy as np

# ── Paths ─────────────────────────────────────────────────────────────────────

SCRIPT_DIR  = Path(__file__).parent
DATA_DIR    = SCRIPT_DIR / "data" / "raw" / "images" / "tb_chest_xray"
OUTPUT_DIR  = SCRIPT_DIR.parent / "models" / "vision"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
MODEL_PATH  = OUTPUT_DIR / "tb_xray_model.pt"

# ── Transforms ────────────────────────────────────────────────────────────────

TRAIN_TRANSFORM = transforms.Compose([
    transforms.Resize((256, 256)),
    transforms.RandomCrop(224),
    transforms.RandomHorizontalFlip(),
    transforms.RandomRotation(15),
    transforms.ColorJitter(brightness=0.2, contrast=0.2),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
])

VAL_TRANSFORM = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
])


class SplitDataset(torch.utils.data.Dataset):
    """Wrapper to apply different transforms to train/val splits."""
    def __init__(self, subset, transform):
        self.subset = subset
        self.transform = transform

    def __len__(self):
        return len(self.subset)

    def __getitem__(self, idx):
        img, label = self.subset[idx]
        return self.transform(img), label


# ── Training ──────────────────────────────────────────────────────────────────

def train(epochs: int = 20, batch_size: int = 32, lr: float = 1e-4):
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"[TB] Device: {device}")
    print(f"[TB] Data:   {DATA_DIR}")

    if not DATA_DIR.exists():
        print(f"ERROR: Dataset not found at {DATA_DIR}", file=sys.stderr)
        sys.exit(1)

    # Load full dataset with NO transform — images stay as PIL so SplitDataset
    # can apply train/val transforms independently on each split.
    full_ds = datasets.ImageFolder(str(DATA_DIR), transform=None)
    print(f"[TB] Classes: {full_ds.classes}")
    print(f"[TB] Total images: {len(full_ds)}")

    # 80/10/10 split
    n_total = len(full_ds)
    n_val   = int(n_total * 0.10)
    n_test  = int(n_total * 0.10)
    n_train = n_total - n_val - n_test
    train_sub, val_sub, test_sub = random_split(
        full_ds, [n_train, n_val, n_test],
        generator=torch.Generator().manual_seed(42),
    )

    train_ds = SplitDataset(train_sub, TRAIN_TRANSFORM)
    val_ds   = SplitDataset(val_sub,   VAL_TRANSFORM)
    test_ds  = SplitDataset(test_sub,  VAL_TRANSFORM)

    # Class weights (inverse frequency) for imbalanced Normal:TB = 5:1
    class_counts = [0, 0]
    for _, label in train_sub:
        class_counts[label] += 1
    weights = [n_train / c for c in class_counts]
    class_weights = torch.tensor(weights, dtype=torch.float).to(device)
    print(f"[TB] Class weights: {class_weights.tolist()}")

    # num_workers=0 avoids Windows multiprocessing issues with DataLoader workers.
    # pin_memory=False since there is no CUDA accelerator on this machine.
    train_loader = DataLoader(train_ds, batch_size=batch_size, shuffle=True,  num_workers=0, pin_memory=False)
    val_loader   = DataLoader(val_ds,   batch_size=batch_size, shuffle=False, num_workers=0, pin_memory=False)
    test_loader  = DataLoader(test_ds,  batch_size=batch_size, shuffle=False, num_workers=0, pin_memory=False)

    # Model — pretrained ResNet50, replace head for 2 classes
    model = models.resnet50(weights=models.ResNet50_Weights.IMAGENET1K_V2)

    # Freeze all layers initially — fine-tune only the head
    for param in model.parameters():
        param.requires_grad = False
    model.fc = nn.Linear(model.fc.in_features, 2)
    model = model.to(device)

    criterion = nn.CrossEntropyLoss(weight=class_weights)
    optimizer = torch.optim.AdamW(model.fc.parameters(), lr=lr)
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=epochs)

    best_auc  = 0.0
    unfreeze_done = False

    for epoch in range(1, epochs + 1):
        # Unfreeze all layers at epoch 5 for full fine-tuning
        if epoch == 5 and not unfreeze_done:
            for param in model.parameters():
                param.requires_grad = True
            optimizer = torch.optim.AdamW(model.parameters(), lr=lr * 0.1)
            scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=epochs - epoch)
            unfreeze_done = True
            print("[TB] All layers unfrozen — full fine-tuning started")

        # ── Train ────────────────────────────────────────────────────────────
        model.train()
        train_loss = 0.0
        for imgs, labels in train_loader:
            imgs, labels = imgs.to(device), labels.to(device)
            optimizer.zero_grad()
            loss = criterion(model(imgs), labels)
            loss.backward()
            optimizer.step()
            train_loss += loss.item()
        scheduler.step()

        # ── Validate ─────────────────────────────────────────────────────────
        model.eval()
        all_probs, all_labels = [], []
        with torch.no_grad():
            for imgs, labels in val_loader:
                imgs = imgs.to(device)
                probs = torch.softmax(model(imgs), dim=1)[:, 1].cpu().tolist()
                all_probs.extend(probs)
                all_labels.extend(labels.tolist())

        val_auc = roc_auc_score(all_labels, all_probs)
        print(f"Epoch {epoch:3d}/{epochs}  loss={train_loss/len(train_loader):.4f}  val_AUC={val_auc:.4f}")

        if val_auc > best_auc:
            best_auc = val_auc
            torch.save(model.state_dict(), str(MODEL_PATH))
            print(f"  --> Saved best model (AUC={best_auc:.4f})")

    # ── Test ─────────────────────────────────────────────────────────────────
    print("\n[TB] Loading best checkpoint for test evaluation...")
    model.load_state_dict(torch.load(str(MODEL_PATH), map_location=device, weights_only=True))
    model.eval()
    all_probs, all_labels = [], []
    with torch.no_grad():
        for imgs, labels in test_loader:
            imgs = imgs.to(device)
            probs = torch.softmax(model(imgs), dim=1)[:, 1].cpu().tolist()
            all_probs.extend(probs)
            all_labels.extend(labels.tolist())

    test_auc = roc_auc_score(all_labels, all_probs)
    preds = [1 if p >= 0.5 else 0 for p in all_probs]
    acc   = sum(p == l for p, l in zip(preds, all_labels)) / len(all_labels)

    print(f"\n[TB] === Test Results ===")
    print(f"  Accuracy : {acc:.4f}")
    print(f"  ROC-AUC  : {test_auc:.4f}")
    print(f"  Model saved to: {MODEL_PATH}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train TB X-ray ResNet50 classifier")
    parser.add_argument("--epochs",     type=int,   default=20,    help="Number of training epochs")
    parser.add_argument("--batch-size", type=int,   default=32,    help="Batch size")
    parser.add_argument("--lr",         type=float, default=1e-4,  help="Initial learning rate")
    args = parser.parse_args()
    train(epochs=args.epochs, batch_size=args.batch_size, lr=args.lr)
