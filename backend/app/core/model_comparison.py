"""
Model comparison -- runs all 3 models (LR, RF, XGBoost) for a given disease
and collects predictions, risk levels, and SHAP explanations into a single
comparison structure.
"""

from app.core.model_loader import MODEL_KEYS, MODEL_NAMES, get_features, get_model
from app.core.risk_scoring import compute_ensemble_probability, compute_risk_level
from app.core.shap_utils import explain_prediction


def compare_models(
    disease: str,
    X_scaled,
    raw_input: dict[str, float],
) -> dict:
    """
    Run all 3 models for a disease and return a comparison dict.

    Args:
        disease:    "diabetes", "heart", "tb", or "cancer"
        X_scaled:   preprocessed input array of shape (1, n_features)
        raw_input:  original unscaled user input dict

    Returns:
        {
            "models": [
                {
                    "model_key": "lr",
                    "model_name": "Logistic Regression",
                    "probability": 0.72,
                    "risk_level": "High",
                    "shap_top": [ { "feature": ..., "value": ..., "shap_value": ..., "direction": ... }, ... ]
                },
                ...
            ],
            "ensemble_probability": 0.68,
            "ensemble_risk_level": "Moderate"
        }
    """
    feature_names = get_features(disease)
    model_results = []
    probabilities = {}

    for key in MODEL_KEYS:
        model = get_model(disease, key)

        # Get positive-class probability
        proba = float(model.predict_proba(X_scaled)[0, 1])
        proba = round(proba, 4)
        probabilities[key] = proba

        # Risk level
        risk_level = compute_risk_level(proba)

        # SHAP explanation
        shap_top = explain_prediction(model, key, X_scaled, feature_names, raw_input)

        model_results.append({
            "model_key": key,
            "model_name": MODEL_NAMES[key],
            "probability": proba,
            "risk_level": risk_level,
            "shap_top": shap_top,
        })

    # Ensemble
    ensemble_prob = compute_ensemble_probability(probabilities)
    ensemble_risk = compute_risk_level(ensemble_prob)

    return {
        "models": model_results,
        "ensemble_probability": ensemble_prob,
        "ensemble_risk_level": ensemble_risk,
    }
