"""
Predict router -- disease risk prediction endpoints.

Endpoints:
    POST /api/predict/{disease}          -- run prediction with SHAP explanations
    GET  /api/predict/{disease}/features -- list expected features for a disease
"""

from datetime import datetime, timezone

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status

from app.core.model_comparison import compare_models
from app.core.model_loader import DISEASES, get_features, is_loaded
from app.core.preprocessing import preprocess_input
from app.db import get_db
from app.models.prediction import (
    FeaturesResponse,
    ModelResult,
    PredictRequest,
    PredictResponse,
    ShapFeature,
)
from app.security.dependencies import get_current_user, user_has_consented
from app.utils.logging import get_logger

logger = get_logger(__name__)
router = APIRouter()

VALID_DISEASES = set(DISEASES)


def _validate_disease(disease: str) -> None:
    """Raise 404 if the disease key is not valid."""
    if disease not in VALID_DISEASES:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Disease '{disease}' not found. Valid: {sorted(VALID_DISEASES)}",
        )


@router.post("/predict/{disease}", response_model=PredictResponse)
async def predict(
    disease: str,
    body: PredictRequest,
    current_user: dict | None = Depends(get_current_user),
):
    """
    Run all 3 models (LR, RF, XGBoost) on the submitted features and return
    predictions with SHAP explanations.

    - Works for both guests and authenticated users.
    - Predictions are only persisted for authenticated + consented users.
    - Returns ensemble probability and risk level alongside individual model results.
    """
    _validate_disease(disease)

    if not is_loaded():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Models not loaded. Server may still be starting up.",
        )

    # Validate and preprocess input
    try:
        X_scaled = preprocess_input(disease, body.features)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(e),
        )

    # Run all 3 models with SHAP
    comparison = compare_models(disease, X_scaled, body.features)

    # Build response
    models_out = [
        ModelResult(
            model_key=m["model_key"],
            model_name=m["model_name"],
            probability=m["probability"],
            risk_level=m["risk_level"],
            shap_top=[ShapFeature(**s) for s in m["shap_top"]],
        )
        for m in comparison["models"]
    ]

    prediction_id = None

    # Persist for authenticated + consented users
    if current_user and user_has_consented(current_user):
        db = get_db()
        doc = {
            "user_id": current_user["sub"],
            "disease": disease,
            "features": body.features,
            "models": comparison["models"],
            "ensemble_probability": comparison["ensemble_probability"],
            "ensemble_risk_level": comparison["ensemble_risk_level"],
            "created_at": datetime.now(timezone.utc),
        }
        result = await db.predictions.insert_one(doc)
        prediction_id = str(result.inserted_id)
        logger.info("Prediction saved: %s for user %s", prediction_id, current_user["sub"])

    return PredictResponse(
        disease=disease,
        models=models_out,
        ensemble_probability=comparison["ensemble_probability"],
        ensemble_risk_level=comparison["ensemble_risk_level"],
        prediction_id=prediction_id,
    )


@router.get("/predict/{disease}/features", response_model=FeaturesResponse)
async def get_disease_features(disease: str):
    """
    Returns the ordered list of features expected by the prediction endpoint
    for a given disease. Useful for dynamically generating frontend forms.
    """
    _validate_disease(disease)

    if not is_loaded():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Models not loaded.",
        )

    features = get_features(disease)
    return FeaturesResponse(disease=disease, features=features, count=len(features))
