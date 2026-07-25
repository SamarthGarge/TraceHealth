"""
Export router — lets authenticated users download their prediction history
as CSV or JSON.

Endpoints:
  GET /api/export/predictions?format=csv|json   — full history export
  GET /api/export/predictions/{id}?format=csv|json — single prediction export

Security:
  - Requires authentication (same as history router)
  - User can only export their own data (ownership enforced)
  - No PII beyond what the user already entered as features
"""

import csv
import io
import json
from datetime import datetime, timezone

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse

from app.db import get_db
from app.security.dependencies import require_auth

router = APIRouter()

VALID_FORMATS = {"csv", "json"}


def _flatten_prediction(doc: dict) -> dict:
    """
    Flatten a prediction document into a single-level dict suitable for CSV.
    """
    base = {
        "id":                  str(doc.get("_id", "")),
        "disease":             doc.get("disease", ""),
        "ensemble_probability":doc.get("ensemble_probability", ""),
        "ensemble_risk_level": doc.get("ensemble_risk_level", ""),
        "created_at":          doc.get("created_at", "").isoformat()
                               if isinstance(doc.get("created_at"), datetime) else str(doc.get("created_at", "")),
    }

    # Flatten feature values
    for k, v in (doc.get("features") or {}).items():
        base[f"feature_{k}"] = v

    # Flatten per-model results
    for model_result in (doc.get("models") or []):
        key = model_result.get("model_key", "unknown")
        base[f"model_{key}_probability"] = model_result.get("probability", "")
        base[f"model_{key}_risk_level"]  = model_result.get("risk_level", "")

    return base


def _make_csv(rows: list[dict]) -> str:
    """Serialise a list of flat dicts to CSV string."""
    if not rows:
        return ""
    buf = io.StringIO()
    writer = csv.DictWriter(buf, fieldnames=rows[0].keys(), extrasaction="ignore")
    writer.writeheader()
    writer.writerows(rows)
    return buf.getvalue()


def _make_json(docs: list[dict]) -> str:
    """Serialise prediction docs to pretty JSON (ObjectId → str, datetime → ISO)."""
    def default(obj):
        if isinstance(obj, ObjectId):
            return str(obj)
        if isinstance(obj, datetime):
            return obj.isoformat()
        raise TypeError(f"Object of type {type(obj)} is not JSON serializable")

    return json.dumps(docs, indent=2, default=default)


# ── Helpers ───────────────────────────────────────────────────────────────────

def _validate_format(fmt: str) -> str:
    fmt = fmt.lower()
    if fmt not in VALID_FORMATS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid format '{fmt}'. Allowed: csv, json.",
        )
    return fmt


def _timestamp() -> str:
    return datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/export/predictions")
async def export_all_predictions(
    format: str = Query("csv", description="Export format: 'csv' or 'json'"),
    disease: str = Query(None, description="Filter by disease (optional)"),
    current_user: dict = Depends(require_auth),
):
    """
    Export the authenticated user's full prediction history as CSV or JSON.
    Optionally filter by disease.
    """
    db = get_db()
    fmt = _validate_format(format)

    query: dict = {"user_id": current_user["sub"]}
    if disease:
        query["disease"] = disease.lower()

    cursor = db.predictions.find(query).sort("created_at", -1)
    docs = await cursor.to_list(length=10_000)   # hard cap at 10k rows

    timestamp = _timestamp()
    disease_tag = f"_{disease}" if disease else ""
    filename = f"tracehealth_predictions{disease_tag}_{timestamp}.{fmt}"

    if fmt == "csv":
        rows = [_flatten_prediction(doc) for doc in docs]
        content = _make_csv(rows)
        media_type = "text/csv"
    else:
        content = _make_json(docs)
        media_type = "application/json"

    return StreamingResponse(
        io.BytesIO(content.encode("utf-8")),
        media_type=media_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/export/predictions/{prediction_id}")
async def export_single_prediction(
    prediction_id: str,
    format: str = Query("json", description="Export format: 'csv' or 'json'"),
    current_user: dict = Depends(require_auth),
):
    """
    Export a single prediction record.
    Ownership check: returns 404 if the prediction doesn't belong to this user.
    """
    db = get_db()
    fmt = _validate_format(format)

    try:
        oid = ObjectId(prediction_id)
    except Exception:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Prediction not found.")

    doc = await db.predictions.find_one({"_id": oid, "user_id": current_user["sub"]})
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Prediction not found.")

    timestamp = _timestamp()
    filename = f"tracehealth_{doc.get('disease', 'prediction')}_{timestamp}.{fmt}"

    if fmt == "csv":
        rows = [_flatten_prediction(doc)]
        content = _make_csv(rows)
        media_type = "text/csv"
    else:
        content = _make_json([doc])
        media_type = "application/json"

    return StreamingResponse(
        io.BytesIO(content.encode("utf-8")),
        media_type=media_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
