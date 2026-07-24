"""
SHAP explainability utilities -- generates per-prediction feature attributions
using the appropriate SHAP explainer for each model type.

Returns a sorted list of the top contributing features with their SHAP values
and direction (increases/decreases risk).
"""

import numpy as np
import shap

from app.utils.logging import get_logger

logger = get_logger(__name__)

# Number of top SHAP features to return per model
TOP_N = 5


def explain_prediction(
    model,
    model_key: str,
    X_scaled: np.ndarray,
    feature_names: list[str],
    raw_input: dict[str, float],
) -> list[dict]:
    """
    Generate SHAP explanations for a single prediction.

    Args:
        model:          trained sklearn-compatible model
        model_key:      "lr", "rf", or "xgb"
        X_scaled:       scaled input array of shape (1, n_features)
        feature_names:  ordered list of feature name strings
        raw_input:      original unscaled user input dict

    Returns:
        List of dicts sorted by |shap_value| descending:
        [
            {
                "feature": "Glucose",
                "value": 148.0,
                "shap_value": 1.23,
                "direction": "increases_risk"
            },
            ...
        ]

    Returns an empty list if SHAP computation fails (logged as warning).
    """
    try:
        if model_key == "lr":
            # LinearExplainer needs a background dataset representing the "average"
            # input. Since features are StandardScaler'd (mean=0, std=1), a zero
            # vector is the population mean in scaled space.
            background = np.zeros_like(X_scaled)
            explainer = shap.LinearExplainer(model, background)
        else:
            explainer = shap.TreeExplainer(model)

        shap_values = explainer.shap_values(X_scaled)

        # Handle different SHAP output formats:
        #   - list [neg_class, pos_class]  (RF)
        #   - 3D array (n_samples, n_features, n_classes)
        #   - 2D array (n_samples, n_features)
        if isinstance(shap_values, list):
            sv = np.array(shap_values[1])  # positive class
        elif shap_values.ndim == 3:
            sv = shap_values[:, :, 1]
        else:
            sv = shap_values

        # sv is now shape (1, n_features) -- squeeze to 1D
        sv = sv.flatten()

        # Build results sorted by absolute SHAP value
        indices = np.argsort(np.abs(sv))[::-1][:TOP_N]

        results = []
        for idx in indices:
            fname = feature_names[idx]
            results.append({
                "feature": fname,
                "value": round(float(raw_input.get(fname, 0)), 4),
                "shap_value": round(float(sv[idx]), 4),
                "direction": "increases_risk" if sv[idx] > 0 else "decreases_risk",
            })

        return results

    except Exception as e:
        logger.warning("SHAP explanation failed for %s: %s", model_key, e)
        return []
