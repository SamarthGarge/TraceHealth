"""
Admin router — system-level read-only statistics for admin users.

All endpoints require the 'admin' role (returns 404 for non-admins,
not 403, to avoid confirming the routes exist — per Backend.md §4.3).

Endpoints:
  GET /api/admin/stats              — platform-wide aggregate counts
  GET /api/admin/users              — paginated user list (no passwords)
  GET /api/admin/users/{user_id}    — single user detail
  GET /api/admin/predictions/recent — recent predictions across all users
"""

from datetime import datetime, timezone

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pymongo import DESCENDING

from app.db import get_db
from app.security.dependencies import require_admin

router = APIRouter()


def _safe_str(val) -> str:
    """Convert ObjectId/datetime to string safely."""
    if isinstance(val, ObjectId):
        return str(val)
    if isinstance(val, datetime):
        return val.isoformat()
    return str(val) if val is not None else ""


def _serialize_user(doc: dict) -> dict:
    """Serialize a user doc — never include password_hash."""
    return {
        "id":                str(doc.get("_id", "")),
        "name":              doc.get("name", ""),
        "email":             doc.get("email", ""),
        "role":              doc.get("role", "user"),
        "auth_provider":     doc.get("auth_provider", "local"),
        "consentDataStorage":bool(doc.get("consentDataStorage", False)),
        "created_at":        _safe_str(doc.get("created_at", "")),
        "last_login_at":     _safe_str(doc.get("last_login_at", "")),
    }


def _serialize_prediction(doc: dict) -> dict:
    return {
        "id":                  str(doc.get("_id", "")),
        "user_id":             doc.get("user_id", ""),
        "disease":             doc.get("disease", ""),
        "ensemble_probability":doc.get("ensemble_probability"),
        "ensemble_risk_level": doc.get("ensemble_risk_level", ""),
        "created_at":          _safe_str(doc.get("created_at", "")),
    }


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/admin/stats")
async def get_platform_stats(admin: dict = Depends(require_admin)):
    """
    Platform-wide aggregate counts.
    Fast — each count is a separate indexed query.
    """
    db = get_db()

    total_users       = await db.users.count_documents({})
    admin_users       = await db.users.count_documents({"role": "admin"})
    consented_users   = await db.users.count_documents({"consentDataStorage": True})
    total_predictions = await db.predictions.count_documents({})
    total_uploads     = await db.uploads.count_documents({})

    # Predictions per disease
    disease_counts: dict[str, int] = {}
    for disease in ("diabetes", "heart", "tb", "cancer"):
        disease_counts[disease] = await db.predictions.count_documents({"disease": disease})

    # Risk level distribution
    risk_counts: dict[str, int] = {}
    for level in ("Low", "Moderate", "High"):
        risk_counts[level] = await db.predictions.count_documents({"ensemble_risk_level": level})

    return {
        "users": {
            "total":     total_users,
            "admins":    admin_users,
            "consented": consented_users,
        },
        "predictions": {
            "total":    total_predictions,
            "by_disease": disease_counts,
            "by_risk":    risk_counts,
        },
        "uploads": {
            "total": total_uploads,
        },
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }


@router.get("/admin/users")
async def list_users(
    skip:  int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    admin: dict = Depends(require_admin),
):
    """Paginated list of all users. Never returns password_hash."""
    db = get_db()
    total = await db.users.count_documents({})
    cursor = db.users.find(
        {},
        {"password_hash": 0}   # explicit exclusion at DB level
    ).sort("created_at", DESCENDING).skip(skip).limit(limit)
    docs = await cursor.to_list(length=limit)
    return {
        "items": [_serialize_user(d) for d in docs],
        "total": total,
        "skip":  skip,
        "limit": limit,
    }


@router.get("/admin/users/{user_id}")
async def get_user_detail(
    user_id: str,
    admin: dict = Depends(require_admin),
):
    """Single user detail by ObjectId string. Never returns password_hash."""
    db = get_db()
    try:
        oid = ObjectId(user_id)
    except Exception:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    doc = await db.users.find_one({"_id": oid}, {"password_hash": 0})
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    # Also fetch this user's prediction count and last prediction
    pred_count = await db.predictions.count_documents({"user_id": str(oid)})
    last_pred  = await db.predictions.find_one(
        {"user_id": str(oid)},
        sort=[("created_at", DESCENDING)]
    )

    result = _serialize_user(doc)
    result["prediction_count"] = pred_count
    result["last_prediction_at"] = _safe_str(last_pred.get("created_at")) if last_pred else None

    return result


@router.get("/admin/predictions/recent")
async def get_recent_predictions(
    skip:    int = Query(0, ge=0),
    limit:   int = Query(20, ge=1, le=100),
    disease: str = Query(None),
    admin: dict = Depends(require_admin),
):
    """Recent predictions across all users, newest first. Optional disease filter."""
    db = get_db()
    query: dict = {}
    if disease:
        query["disease"] = disease.lower()

    total  = await db.predictions.count_documents(query)
    cursor = db.predictions.find(query).sort("created_at", DESCENDING).skip(skip).limit(limit)
    docs   = await cursor.to_list(length=limit)

    return {
        "items": [_serialize_prediction(d) for d in docs],
        "total": total,
        "skip":  skip,
        "limit": limit,
    }
