"""
train_cancer_image.py — Train ResNet50 for lung cancer CT classification.

Two models are trained:
  1. CT model (IQ-OTH/NCCD):    3-class — Benign / Malignant / Normal
  2. Histopathology model (LC25000): 3-class — lung_aca / lung_n / lung_scc

Dataset layout expected:
  training/data/raw/images/iqothnccd_ct/
    Bengin cases/    (120 images)
    Malignant cases/ (561 images)
    Normal cases/    (416 images)

  training/data/raw/images/lc25000_histopathology/lung_image_sets/
    lung_aca/    (5000 images)
    lung_n/      (5000 images)
    lung_scc/    (5000 images)

Output:
  models/vision/cancer_ct_model.pt
  models/vision/cancer_hist_model.pt

Usage:
  cd training
  python train_cancer_image.py [--epochs 20] [--batch-size 32] [--lr 1e-4] [--model ct|hist|both]

Notes:
  - CT dataset is small (1097 images) — aggressive augmentation + WeightedRandomSampler
  - LC25000 is balanced (5k × 3) — standard augmentation
  - Both use ImageNet pretrained ResNet50, progressive unfreezing
"""

import argparse
import sys
from pathlib import Path

import torch
import torch.nn as nn
from torch.utils.data import DataLoader, random_split, WeightedRandomSampler
from torchvision import datasets, models, transforms
from sklearn.metrics import roc_auc_score, classification_report
import numpy as np

# ── Paths ─────────────────────────────────────────────────────────────────────

SCRIPT_DIR    = Path(__file__).parent
CT_DATA_DIR   = SCRIPT_DIR / "data" / "raw" / "images" / "iqothnccd_ct"
HIST_DATA_DIR = SCRIPT_DIR / "data" / "raw" / "images" / "lc25000_histopathology" / "lung_image_sets"
OUTPUT_DIR    = SCRIPT_DIR.parent / "models" / "vision"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

CT_MODEL_PATH   = OUTPUT_DIR / "cancer_ct_model.pt"
HIST_MODEL_PATH = OUTPUT_DIR / "cancer_hist_model.pt"

# ── Transforms ────────────────────────────────────────────────────────────────

CT_TRAIN_TRANSFORM = transforms.Compose([
    transforms.Resize((256, 256)),
    transforms.RandomCrop(224),
    transforms.RandomHorizontalFlip(),
    transforms.RandomVerticalFlip(),
    transforms.RandomRotation(20),
    transforms.ColorJitter(brightness=0.3, contrast=0.3, saturation=0.1),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
])

HIST_TRAIN_TRANSFORM = transforms.Compose([
    transforms.Resize((256, 256)),
    transforms.RandomCrop(224),
    transforms.RandomHorizontalFlip(),
    transforms.RandomRotation(15),
    transforms.ColorJitter(brightness=0.2, contrast=0.2, saturation=0.1, hue=0.05),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
])

VAL_TRANSFORM = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
])


class SplitDataset(torch.utils.data.Dataset):
    def __init__(self, subset, transform):
        self.subset = subset
        self.transform = transform

    def __len__(self):
        return len(self.subset)

    def __getitem__(self, idx):
        img, label = self.subset[idx]
        return self.transform(img), label


# ── Build model ───────────────────────────────────────────────────────────────

def build_resnet(num_classes: int) -> nn.Module:
    model = models.resnet50(weights=models.ResNet50_Weights.IMAGENET1K_V2)
    for param in model.parameters():
        param.requires_grad = False
    model.fc = nn.Linear(model.fc.in_features, num_classes)
    return model


# ── Weighted sampler for imbalanced CT dataset ────────────────────────────────

def make_weighted_sampler(subset):
    labels = [subset.dataset.targets[i] for i in subset.indices]
    class_count = np.bincount(labels)
    weights = 1.0 / class_count
    sample_weights = [weights[l] for l in labels]
    return WeightedRandomSampler(sample_weights, num_samples=len(sample_weights), replacement=True)


# ── Training loop ─────────────────────────────────────────────────────────────

def train_model(
    data_dir: Path,
    model_path: Path,
    train_transform,
    num_classes: int,
    model_name: str,
    epochs: int,
    batch_size: int,
    lr: float,
    use_weighted_sampler: bool = False,
):
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"\n[{model_name}] Device: {device}")
    print(f"[{model_name}] Data:   {data_dir}")

    if not data_dir.exists():
        print(f"ERROR: Dataset not found at {data_dir}", file=sys.stderr)
        return

    full_ds = datasets.ImageFolder(str(data_dir), transform=None)
    print(f"[{model_name}] Classes: {full_ds.classes}")
    print(f"[{model_name}] Total images: {len(full_ds)}")

    n_total = len(full_ds)
    n_val   = max(int(n_total * 0.10), num_classes)
    n_test  = max(int(n_total * 0.10), num_classes)
    n_train = n_total - n_val - n_test
    train_sub, val_sub, test_sub = random_split(
        full_ds, [n_train, n_val, n_test],
        generator=torch.Generator().manual_seed(42),
    )

    train_ds = SplitDataset(train_sub, train_transform)
    val_ds   = SplitDataset(val_sub,   VAL_TRANSFORM)
    test_ds  = SplitDataset(test_sub,  VAL_TRANSFORM)

    if use_weighted_sampler:
        sampler = make_weighted_sampler(train_sub)
        train_loader = DataLoader(train_ds, batch_size=batch_size, sampler=sampler, num_workers=0, pin_memory=False)
    else:
        train_loader = DataLoader(train_ds, batch_size=batch_size, shuffle=True, num_workers=0, pin_memory=False)

    val_loader  = DataLoader(val_ds,  batch_size=batch_size, shuffle=False, num_workers=0, pin_memory=False)
    test_loader = DataLoader(test_ds, batch_size=batch_size, shuffle=False, num_workers=0, pin_memory=False)

    model = build_resnet(num_classes).to(device)
    criterion = nn.CrossEntropyLoss()
    optimizer = torch.optim.AdamW(model.fc.parameters(), lr=lr)
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=epochs)

    best_acc = 0.0
    unfreeze_done = False

    for epoch in range(1, epochs + 1):
        if epoch == 5 and not unfreeze_done:
            for param in model.parameters():
                param.requires_grad = True
            optimizer = torch.optim.AdamW(model.parameters(), lr=lr * 0.1)
            scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=epochs - epoch)
            unfreeze_done = True
            print(f"[{model_name}] All layers unfrozen — full fine-tuning started")

        # Train
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

        # Validate
        model.eval()
        correct, total = 0, 0
        with torch.no_grad():
            for imgs, labels in val_loader:
                imgs, labels = imgs.to(device), labels.to(device)
                preds = model(imgs).argmax(dim=1)
                correct += (preds == labels).sum().item()
                total   += labels.size(0)

        val_acc = correct / total
        print(f"Epoch {epoch:3d}/{epochs}  loss={train_loss/len(train_loader):.4f}  val_acc={val_acc:.4f}")

        if val_acc > best_acc:
            best_acc = val_acc
            torch.save(model.state_dict(), str(model_path))
            print(f"  --> Saved best model (acc={best_acc:.4f})")

    # Test evaluation
    print(f"\n[{model_name}] Loading best checkpoint for test evaluation...")
    model.load_state_dict(torch.load(str(model_path), map_location=device, weights_only=True))
    model.eval()
    all_preds, all_labels = [], []
    with torch.no_grad():
        for imgs, labels in test_loader:
            imgs = imgs.to(device)
            preds = model(imgs).argmax(dim=1).cpu().tolist()
            all_preds.extend(preds)
            all_labels.extend(labels.tolist())

    acc = sum(p == l for p, l in zip(all_preds, all_labels)) / len(all_labels)
    print(f"\n[{model_name}] === Test Results ===")
    print(f"  Accuracy: {acc:.4f}")
    print(classification_report(all_labels, all_preds, target_names=full_ds.classes))
    print(f"  Model saved to: {model_path}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train cancer image ResNet50 classifiers")
    parser.add_argument("--epochs",     type=int,   default=20,    help="Training epochs")
    parser.add_argument("--batch-size", type=int,   default=32,    help="Batch size")
    parser.add_argument("--lr",         type=float, default=1e-4,  help="Learning rate")
    parser.add_argument("--model",      type=str,   default="both",
                        choices=["ct", "hist", "both"],
                        help="Which model to train (ct=IQ-OTH/NCCD, hist=LC25000, both=default)")
    args = parser.parse_args()

    if args.model in ("ct", "both"):
        # CT dataset — use weighted sampler due to class imbalance (Benign:120 vs Malignant:561)
        train_model(
            data_dir=CT_DATA_DIR,
            model_path=CT_MODEL_PATH,
            train_transform=CT_TRAIN_TRANSFORM,
            num_classes=3,
            model_name="CancerCT",
            epochs=args.epochs,
            batch_size=args.batch_size,
            lr=args.lr,
            use_weighted_sampler=True,
        )

    if args.model in ("hist", "both"):
        # LC25000 histopathology — balanced, no weighted sampler needed
        train_model(
            data_dir=HIST_DATA_DIR,
            model_path=HIST_MODEL_PATH,
            train_transform=HIST_TRAIN_TRANSFORM,
            num_classes=3,
            model_name="CancerHist",
            epochs=args.epochs,
            batch_size=args.batch_size,
            lr=args.lr,
            use_weighted_sampler=False,
        )
