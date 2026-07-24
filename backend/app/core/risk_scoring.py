"""
Risk scoring -- converts model probability to a human-readable risk level
and provides ensemble (average) probability across all 3 models.
"""


def compute_risk_level(probability: float) -> str:
    """
    Map a model's positive-class probability to a risk level string.

    Thresholds:
        < 0.3   -> "Low"
        < 0.7   -> "Moderate"
        >= 0.7  -> "High"

    These thresholds are for educational screening only and do NOT
    represent clinical diagnostic cutoffs.
    """
    if probability < 0.3:
        return "Low"
    elif probability < 0.7:
        return "Moderate"
    else:
        return "High"


def compute_ensemble_probability(model_probabilities: dict[str, float]) -> float:
    """
    Simple average ensemble across all model probabilities.

    Args:
        model_probabilities: {"lr": 0.72, "rf": 0.65, "xgb": 0.68}

    Returns:
        Average probability (float)
    """
    if not model_probabilities:
        return 0.0
    return round(sum(model_probabilities.values()) / len(model_probabilities), 4)
