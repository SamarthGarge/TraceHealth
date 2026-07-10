"""
GET /api/models/metadata — returns model leaderboard data from the model_metadata collection.
Seeded at startup from models/model_metadata.json (see db.py).
Public endpoint — no authentication required (Insights page is public per Screen Inventory).
"""
from fastapi import APIRouter, HTTPException, status

from app.db import get_db

router = APIRouter()

VALID_DISEASES = {"diabetes", "heart", "tb", "cancer"}


@router.get("/models/metadata")
async def get_all_metadata():
    """Returns model metadata for all 4 diseases (leaderboard data source)."""
    db = get_db()
    cursor = db.model_metadata.find({}, {"_id": 0})
    docs = await cursor.to_list(length=100)
    return {"metadata": docs}


@router.get("/models/metadata/{disease}")
async def get_disease_metadata(disease: str):
    """Returns model metadata for a single disease."""
    if disease not in VALID_DISEASES:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Disease '{disease}' not found. Valid: {sorted(VALID_DISEASES)}",
        )
    db = get_db()
    doc = await db.model_metadata.find_one({"disease": disease}, {"_id": 0})
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No metadata found for disease '{disease}'. Run training scripts first.",
        )
    return doc
