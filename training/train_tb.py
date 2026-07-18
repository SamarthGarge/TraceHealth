"""
Train Tuberculosis models — Logistic Regression, Random Forest, XGBoost.

Dataset: Tuberculosis Symptoms (tuberculosis_symptoms.csv)
  - 1000 rows of TB-positive patients with 13 binary symptom columns
  - No explicit target column — all rows are TB patients
  - Preprocessing generates ~500 synthetic healthy controls (Bernoulli p=0.15)
  - Final dataset: ~1500 rows, 14 features, binary target (TB 0/1)

Usage:
    cd training
    python train_tb.py
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from sklearn.model_selection import train_test_split

from preprocessing import preprocess_tb
from utils import (
    print_report,
    save_artifacts,
    train_and_evaluate,
    validate_shap,
)

DATA_PATH = Path(__file__).resolve().parent / "data" / "raw" / "tabular" / "tuberculosis_symptoms.csv"
DISEASE_KEY = "tb"


def main():
    print(f"\n  Loading {DATA_PATH.name}...")
    X, y, feature_names, scaler = preprocess_tb(DATA_PATH)

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
