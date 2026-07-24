"""
Model loader -- loads all trained .joblib models, scalers, and feature names
at application startup. Stores them in a module-level registry for O(1) access
during prediction requests.

Called from main.py lifespan:
    from app.core.model_loader import load_all_models
    load_all_models()
"""

import json
from pathlib import Path

import joblib

from app.config import settings
from app.utils.logging import get_logger

logger = get_logger(__name__)

# Module-level registry populated by load_all_models()
# Structure: { "diabetes": { "lr": model, "rf": model, "xgb": model,
#                             "scaler": scaler, "features": [...] } }
_registry: dict[str, dict] = {}

DISEASES = ["diabetes", "heart", "tb", "cancer"]
MODEL_KEYS = ["lr", "rf", "xgb"]
MODEL_NAMES = {
    "lr": "Logistic Regression",
    "rf": "Random Forest",
    "xgb": "XGBoost",
}


def load_all_models(models_dir: str | None = None) -> None:
    """
    Load all .joblib models, scalers, and feature name manifests into memory.

    Expected file layout per disease:
        {disease}_lr.joblib
        {disease}_rf.joblib
        {disease}_xgb.joblib
        {disease}_scaler.joblib
        {disease}_feature_names.json

    Raises FileNotFoundError if any required artifact is missing.
    """
    global _registry

    base = Path(models_dir) if models_dir else _resolve_models_dir()
    logger.info("Loading models from %s", base)

    loaded_count = 0

    for disease in DISEASES:
        entry: dict = {}

        # Load the 3 trained models
        for key in MODEL_KEYS:
            path = base / f"{disease}_{key}.joblib"
            if not path.exists():
                logger.warning("Model file missing: %s -- skipping %s", path, disease)
                break
            entry[key] = joblib.load(path)
            loaded_count += 1

        else:
            # Only reaches here if the inner loop didn't break (all 3 models found)
            # Load scaler
            scaler_path = base / f"{disease}_scaler.joblib"
            if not scaler_path.exists():
                logger.warning("Scaler missing: %s -- skipping %s", scaler_path, disease)
                continue
            entry["scaler"] = joblib.load(scaler_path)

            # Load feature names
            features_path = base / f"{disease}_feature_names.json"
            if not features_path.exists():
                logger.warning("Feature names missing: %s -- skipping %s", features_path, disease)
                continue
            with open(features_path) as f:
                entry["features"] = json.load(f)

            _registry[disease] = entry
            logger.info(
                "  %s: %d models, %d features",
                disease, len(MODEL_KEYS), len(entry["features"]),
            )

    logger.info("Loaded %d diseases, %d models total", len(_registry), loaded_count)


def _resolve_models_dir() -> Path:
    """Resolve the models directory -- TraceHealth/models/ from backend/app/core/."""
    # __file__ is backend/app/core/model_loader.py
    # Go up 3 levels to backend/, then up 1 more to TraceHealth/, then into models/
    project_root = Path(__file__).resolve().parent.parent.parent.parent
    return project_root / "models"


# ---- Public accessors --------------------------------------------------------

def get_model(disease: str, model_key: str):
    """Get a trained model by disease and model key (lr/rf/xgb)."""
    if disease not in _registry:
        raise KeyError(f"Disease '{disease}' not loaded. Available: {list(_registry.keys())}")
    if model_key not in _registry[disease]:
        raise KeyError(f"Model '{model_key}' not found for disease '{disease}'.")
    return _registry[disease][model_key]


def get_scaler(disease: str):
    """Get the fitted StandardScaler for a disease."""
    if disease not in _registry:
        raise KeyError(f"Disease '{disease}' not loaded.")
    return _registry[disease]["scaler"]


def get_features(disease: str) -> list[str]:
    """Get the ordered list of feature names for a disease."""
    if disease not in _registry:
        raise KeyError(f"Disease '{disease}' not loaded.")
    return _registry[disease]["features"]


def get_all_diseases() -> list[str]:
    """Get all loaded disease keys."""
    return list(_registry.keys())


def is_loaded() -> bool:
    """Check if any models have been loaded."""
    return len(_registry) > 0
