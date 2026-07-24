"""
Input preprocessing for inference -- transforms a raw user-input dict into a
scaled numpy array ready for model prediction.

Uses the saved StandardScaler and feature order from training (loaded via model_loader).
"""

import numpy as np

from app.core.model_loader import get_features, get_scaler


def preprocess_input(disease: str, raw_input: dict[str, float]) -> np.ndarray:
    """
    Transform raw user input into a model-ready scaled array.

    Args:
        disease:    one of "diabetes", "heart", "tb", "cancer"
        raw_input:  dict mapping feature names to numeric values
                    e.g. {"Glucose": 148, "BMI": 33.6, ...}

    Returns:
        np.ndarray of shape (1, n_features) -- scaled and ordered to match training

    Raises:
        ValueError: if required features are missing from raw_input
    """
    feature_names = get_features(disease)
    scaler = get_scaler(disease)

    # Check for missing features
    missing = [f for f in feature_names if f not in raw_input]
    if missing:
        raise ValueError(
            f"Missing required features for {disease}: {missing}. "
            f"Expected: {feature_names}"
        )

    # Build the feature vector in the exact training order
    values = [float(raw_input[f]) for f in feature_names]
    X = np.array(values).reshape(1, -1)

    # Apply the same scaling that was used during training
    X_scaled = scaler.transform(X)

    return X_scaled
