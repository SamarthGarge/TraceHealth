"""
Train Diabetes models — Logistic Regression, Random Forest, XGBoost.

Dataset: Pima Indians Diabetes (diabetes.csv)
  - 768 rows, 8 numeric features, binary target (Outcome 0/1)
  - Clinically-impossible zeros median-imputed (see preprocessing.py)

Usage:
    cd training
    python train_diabetes.py
"""

import sys
from pathlib import Path

# Ensure the training package is importable regardless of cwd
sys.path.insert(0, str(Path(__file__).resolve().parent))

from sklearn.model_selection import train_test_split

from preprocessing import preprocess_diabetes
from utils import (
    print_report,
    save_artifacts,
    train_and_evaluate,
    validate_shap,
)

DATA_PATH = Path(__file__).resolve().parent / "data" / "raw" / "tabular" / "diabetes.csv"
DISEASE_KEY = "diabetes"


def main():
    print(f"\n  Loading {DATA_PATH.name}...")
    X, y, feature_names, scaler = preprocess_diabetes(DATA_PATH)

    # 80/20 stratified split
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, stratify=y, random_state=42,
    )

    # Train and evaluate all 3 models
    results = train_and_evaluate(X_train, X_test, y_train, y_test, feature_names, DISEASE_KEY)

    # Print report
    print_report(DISEASE_KEY, results)

    # SHAP validation
    print("  SHAP Validation:")
    X_sample = X_test[:50]
    X_bg = X_train[:100]
    for key, (model, _) in results.items():
        print(f"    {key.upper()}: ", end="")
        validate_shap(model, key, X_sample, feature_names, X_background=X_bg)

    # Save artifacts to models/
    print(f"\n  Saving artifacts...")
    save_artifacts(DISEASE_KEY, results, scaler, feature_names, X_train, X_test)

    print(f"\n  [OK] {DISEASE_KEY.upper()} training complete!\n")


if __name__ == "__main__":
    main()
