"""
Pydantic request/response schemas for the prediction API.
"""

from pydantic import BaseModel, Field


# ---- Request -----------------------------------------------------------------

class PredictRequest(BaseModel):
    """
    Request body for POST /api/predict/{disease}.
    Features dict maps feature names to numeric values.
    """
    features: dict[str, float] = Field(
        ...,
        description="Feature name -> value mapping. "
        "Use GET /api/predict/{disease}/features to get the expected feature names.",
        examples=[{
            "Glucose": 148,
            "BloodPressure": 72,
            "SkinThickness": 35,
            "Insulin": 0,
            "BMI": 33.6,
            "DiabetesPedigreeFunction": 0.627,
            "Age": 50,
            "Pregnancies": 6,
        }],
    )


# ---- Response components -----------------------------------------------------

class ShapFeature(BaseModel):
    """A single SHAP feature attribution."""
    feature: str = Field(description="Feature name")
    value: float = Field(description="Raw input value (unscaled)")
    shap_value: float = Field(description="SHAP contribution to prediction")
    direction: str = Field(description="'increases_risk' or 'decreases_risk'")


class ModelResult(BaseModel):
    """Prediction result from a single model."""
    model_config = {"protected_namespaces": ()}
    model_key: str = Field(description="Model identifier: lr, rf, or xgb")
    model_name: str = Field(description="Human-readable model name")
    probability: float = Field(description="Positive-class probability (0-1)")
    risk_level: str = Field(description="Low, Moderate, or High")
    shap_top: list[ShapFeature] = Field(
        default_factory=list,
        description="Top SHAP feature attributions, sorted by |shap_value| desc",
    )


class PredictResponse(BaseModel):
    """Full prediction response with all 3 models and ensemble."""
    disease: str
    models: list[ModelResult]
    ensemble_probability: float
    ensemble_risk_level: str
    prediction_id: str | None = Field(
        default=None,
        description="MongoDB ObjectId string if the prediction was saved to history "
        "(only for authenticated + consented users)",
    )


# ---- Features list response --------------------------------------------------

class FeaturesResponse(BaseModel):
    """Response for GET /api/predict/{disease}/features."""
    disease: str
    features: list[str] = Field(description="Ordered list of expected feature names")
    count: int = Field(description="Number of features")


# ---- History -----------------------------------------------------------------

class HistoryItem(BaseModel):
    """A single prediction history entry (list view)."""
    id: str = Field(description="Prediction ID")
    disease: str
    ensemble_probability: float
    ensemble_risk_level: str
    created_at: str
