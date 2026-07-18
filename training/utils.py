"""
Shared ML training utilities for TraceHealth.
Used by all 4 disease training scripts (train_diabetes.py, train_heart.py, etc.).

Provides:
  - get_models()          → dict of untrained LR / RF / XGBoost instances
  - evaluate_model()      → accuracy, precision, recall, F1, AUC-ROC
  - train_and_evaluate()  → trains all 3 models, prints progress
  - validate_shap()       → runs SHAP explainer on a sample, prints top features
  - save_artifacts()      → saves .joblib models + scaler + feature_names + metadata
  - print_report()        → formatted console table
"""

import json
from datetime import datetime, timezone
from pathlib import Path

import joblib
import numpy as np
import shap
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)
from xgboost import XGBClassifier

# Default output directory (relative to training/ scripts)
MODELS_DIR = Path(__file__).resolve().parent.parent / "models"

MODEL_LABELS = {
    "lr": "Logistic Regression",
    "rf": "Random Forest",
    "xgb": "XGBoost",
}


# ── Model factory ──────────────────────────────────────────────────────────────

def get_models():
    """Returns a dict of model_key → untrained sklearn-compatible model."""
    return {
        "lr": LogisticRegression(max_iter=1000, C=1.0, random_state=42),
        "rf": RandomForestClassifier(
            n_estimators=200, max_depth=10, random_state=42, n_jobs=-1,
        ),
        "xgb": XGBClassifier(
            n_estimators=200,
            max_depth=6,
            learning_rate=0.1,
            random_state=42,
            eval_metric="logloss",
        ),
    }


# ── Evaluation ─────────────────────────────────────────────────────────────────

def evaluate_model(model, X_test, y_test):
    """Evaluate a trained model and return a metrics dict."""
    y_pred = model.predict(X_test)
    y_proba = model.predict_proba(X_test)[:, 1]

    return {
        "accuracy": round(float(accuracy_score(y_test, y_pred)), 4),
        "precision": round(float(precision_score(y_test, y_pred, zero_division=0)), 4),
        "recall": round(float(recall_score(y_test, y_pred, zero_division=0)), 4),
        "f1": round(float(f1_score(y_test, y_pred, zero_division=0)), 4),
        "roc_auc": round(float(roc_auc_score(y_test, y_proba)), 4),
    }


def train_and_evaluate(X_train, X_test, y_train, y_test, feature_names, disease_key):
    """
    Train LR, RF, XGBoost on the given data.

    Returns:
        dict  { "lr": (trained_model, metrics_dict), "rf": ..., "xgb": ... }
    """
    models = get_models()
    results = {}

    print(f"\n{'=' * 60}")
    print(f"  Training {disease_key.upper()} models")
    print(f"  Train: {len(X_train)} | Test: {len(X_test)} | Features: {len(feature_names)}")
    print(f"{'=' * 60}\n")

    for key, model in models.items():
        label = MODEL_LABELS[key]
        print(f"  Training {label}...", end=" ", flush=True)
        model.fit(X_train, y_train)
        metrics = evaluate_model(model, X_test, y_test)
        results[key] = (model, metrics)
        print(f"done -- Acc: {metrics['accuracy']:.4f}  AUC: {metrics['roc_auc']:.4f}")

    return results


# ── SHAP validation ────────────────────────────────────────────────────────────

def validate_shap(model, model_key, X_sample, feature_names, X_background=None):
    """
    Run SHAP on a small sample to verify explainability works.
    Prints the top-3 most important features by mean |SHAP value|.

    Args:
        model:          trained sklearn model
        model_key:      "lr", "rf", or "xgb"
        X_sample:       numpy array of test samples to explain
        feature_names:  list of feature name strings
        X_background:   background data for LinearExplainer (LR only)
    """
    try:
        if model_key == "lr":
            bg = X_background if X_background is not None else X_sample
            explainer = shap.LinearExplainer(model, bg)
        else:
            explainer = shap.TreeExplainer(model)

        shap_values = explainer.shap_values(X_sample)

        # Binary classifiers may return:
        #   - a list [neg_class_array, pos_class_array]  (RF)
        #   - a 3D array of shape (n_samples, n_features, n_classes)
        #   - a 2D array of shape (n_samples, n_features)
        if isinstance(shap_values, list):
            # Take the positive-class SHAP values
            shap_values = np.array(shap_values[1])
        elif shap_values.ndim == 3:
            # (n_samples, n_features, n_classes) -> take positive class
            shap_values = shap_values[:, :, 1]

        # Mean absolute SHAP value per feature
        mean_abs = np.abs(shap_values).mean(axis=0)
        top_idx = np.argsort(mean_abs)[::-1][:3]
        top_features = [
            (feature_names[i], round(float(mean_abs[i]), 4)) for i in top_idx
        ]

        print(
            f"SHAP top-3: {', '.join(f'{n}={v}' for n, v in top_features)}"
        )
        return True
    except Exception as e:
        print(f"SHAP validation failed: {e}")
        return False


# ── Artifact persistence ───────────────────────────────────────────────────────

def save_artifacts(
    disease_key, results, scaler, feature_names, X_train, X_test, output_dir=None,
):
    """
    Save trained models, scaler, feature names, and update model_metadata.json.

    Outputs (per disease):
        {disease}_lr.joblib
        {disease}_rf.joblib
        {disease}_xgb.joblib
        {disease}_scaler.joblib
        {disease}_feature_names.json
        model_metadata.json  (updated in-place)
    """
    out = Path(output_dir or MODELS_DIR)
    out.mkdir(parents=True, exist_ok=True)

    # Save individual models
    for key, (model, _metrics) in results.items():
        path = out / f"{disease_key}_{key}.joblib"
        joblib.dump(model, path)
        print(f"  Saved {path.name}")

    # Save scaler
    scaler_path = out / f"{disease_key}_scaler.joblib"
    joblib.dump(scaler, scaler_path)
    print(f"  Saved {scaler_path.name}")

    # Save feature names (JSON -- used by backend for SHAP labelling)
    features_path = out / f"{disease_key}_feature_names.json"
    with open(features_path, "w") as f:
        json.dump(feature_names, f, indent=2)
    print(f"  Saved {features_path.name}")

    # Update model_metadata.json
    metadata_path = out / "model_metadata.json"
    if metadata_path.exists():
        with open(metadata_path) as f:
            metadata = json.load(f)
    else:
        metadata = {}

    metadata[disease_key] = {
        "models": {key: metrics for key, (_model, metrics) in results.items()},
        "features": feature_names,
        "n_train": int(len(X_train)),
        "n_test": int(len(X_test)),
        "trained_at": datetime.now(timezone.utc).isoformat(),
    }

    with open(metadata_path, "w") as f:
        json.dump(metadata, f, indent=2)
    print(f"  Updated {metadata_path.name}")


# ── Reporting ──────────────────────────────────────────────────────────────────

def print_report(disease_key, results):
    """Print a formatted evaluation report table."""
    print(f"\n{'-' * 60}")
    print(f"  {disease_key.upper()} -- Evaluation Report")
    print(f"{'-' * 60}")
    header = f"  {'Model':<22} {'Acc':>7} {'Prec':>7} {'Rec':>7} {'F1':>7} {'AUC':>7}"
    print(header)
    print(f"  {'-' * 57}")

    for key, (_model, metrics) in results.items():
        label = MODEL_LABELS[key]
        print(
            f"  {label:<22} "
            f"{metrics['accuracy']:>7.4f} "
            f"{metrics['precision']:>7.4f} "
            f"{metrics['recall']:>7.4f} "
            f"{metrics['f1']:>7.4f} "
            f"{metrics['roc_auc']:>7.4f}"
        )

    print(f"{'-' * 60}\n")
