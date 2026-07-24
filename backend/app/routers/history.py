"""
History router -- CRUD for saved prediction history.

All endpoints require authentication (require_auth).

Endpoints:
    GET    /api/history          -- list user's predictions (newest first, paginated)
    GET    /api/history/{id}     -- single prediction detail
    DELETE /api/history/{id}     -- delete a prediction (ownership check)
"""

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.db import get_db
from app.security.dependencies import require_auth
from app.utils.logging import get_logger

logger = get_logger(__name__)
router = APIRouter()


def _validate_object_id(id_str: str) -> ObjectId:
    """Parse a string to ObjectId, raising 404 on invalid format."""
    try:
        return ObjectId(id_str)
    except (InvalidId, TypeError):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Prediction not found.",
        )


@router.get("/history")
async def list_history(
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=100, description="Max records to return"),
    disease: str | None = Query(None, description="Filter by disease key"),
    current_user: dict = Depends(require_auth),
):
    """
    List the current user's prediction history, newest first.
    Supports pagination (skip/limit) and optional disease filter.
    """
    db = get_db()
    query = {"user_id": current_user["sub"]}
    if disease:
        query["disease"] = disease

    cursor = (
        db.predictions
        .find(query)
        .sort("created_at", -1)
        .skip(skip)
        .limit(limit)
    )
    docs = await cursor.to_list(length=limit)

    # Get total count for pagination metadata
    total = await db.predictions.count_documents(query)

    items = []
    for doc in docs:
        items.append({
            "id": str(doc["_id"]),
            "disease": doc["disease"],
            "ensemble_probability": doc.get("ensemble_probability", 0),
            "ensemble_risk_level": doc.get("ensemble_risk_level", "Unknown"),
            "created_at": doc["created_at"].isoformat() if doc.get("created_at") else None,
        })

    return {
        "items": items,
        "total": total,
        "skip": skip,
        "limit": limit,
    }


@router.get("/history/{prediction_id}")
async def get_history_detail(
    prediction_id: str,
    current_user: dict = Depends(require_auth),
):
    """
    Get full detail for a single prediction, including all model results
    and SHAP explanations.

    Returns 404 if the prediction doesn't exist or doesn't belong to the user
    (ownership-check-then-404 pattern -- never 403).
    """
    db = get_db()
    oid = _validate_object_id(prediction_id)

    doc = await db.predictions.find_one({
        "_id": oid,
        "user_id": current_user["sub"],
    })

    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Prediction not found.",
        )

    # Serialize ObjectId and datetime
    doc["id"] = str(doc.pop("_id"))
    if "created_at" in doc and doc["created_at"]:
        doc["created_at"] = doc["created_at"].isoformat()

    # Remove internal field
    doc.pop("user_id", None)

    return doc


@router.delete("/history/{prediction_id}")
async def delete_history(
    prediction_id: str,
    current_user: dict = Depends(require_auth),
):
    """
    Delete a single prediction from the user's history.
    Returns 404 if not found or not owned by the user.
    """
    db = get_db()
    oid = _validate_object_id(prediction_id)

    result = await db.predictions.delete_one({
        "_id": oid,
        "user_id": current_user["sub"],
    })

    if result.deleted_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Prediction not found.",
        )

    logger.info("Prediction deleted: %s by user %s", prediction_id, current_user["sub"])
    return {"message": "Prediction deleted."}
