"""
Train Lung Cancer models — Logistic Regression, Random Forest, XGBoost.

Dataset: Lung Cancer Survey (survey_lung_cancer.csv)
  - 309 rows, 14 features (GENDER, AGE + 12 symptoms), binary target (LUNG_CANCER YES/NO)
  - GENDER encoded M→1 / F→0
  - Symptom columns may use 1/2 encoding (remapped to 0/1 if detected)

Usage:
    cd training
    python train_cancer.py
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from sklearn.model_selection import train_test_split

from preprocessing import preprocess_cancer
from utils import (
    print_report,
    save_artifacts,
    train_and_evaluate,
    validate_shap,
)

DATA_PATH = Path(__file__).resolve().parent / "data" / "raw" / "tabular" / "survey_lung_cancer.csv"
DISEASE_KEY = "cancer"


def main():
    print(f"\n  Loading {DATA_PATH.name}...")
    X, y, feature_names, scaler = preprocess_cancer(DATA_PATH)

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, stratify=y, random_state=42,
    )

    results = train_and_evaluate(X_train, X_test, y_train, y_test, feature_names, DISEASE_KEY)

    print_report(DISEASE_KEY, results)

    print("  SHAP Validation:")
    X_sample = X_test[:50]
    X_bg = X_train[:100]
    for key, (model, _) in results.items():
        print(f"    {key.upper()}: ", end="")
        validate_shap(model, key, X_sample, feature_names, X_background=X_bg)

    print(f"\n  Saving artifacts...")
    save_artifacts(DISEASE_KEY, results, scaler, feature_names, X_train, X_test)

    print(f"\n  [OK] {DISEASE_KEY.upper()} training complete!\n")


if __name__ == "__main__":
    main()
