"""
Export router — lets authenticated users download their prediction history
as CSV, JSON, or a professional PDF report.

Endpoints:
  GET /api/export/predictions?format=csv|json&date_from=&date_to=
  GET /api/export/predictions/pdf?date_from=&date_to=&disease=
  GET /api/export/predictions/{id}?format=csv|json

Security:
  - Requires authentication (same as history router)
  - User can only export their own data (ownership enforced)
  - No PII beyond what the user already entered as features
"""

import csv
import io
import json
from datetime import datetime, timezone, timedelta

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse

from app.db import get_db
from app.security.dependencies import require_auth
from app.utils.pdf_report import build_prediction_report

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
    """Serialise prediction docs to pretty JSON (ObjectId -> str, datetime -> ISO)."""
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


def _parse_date(value: str | None, default: datetime | None = None) -> datetime | None:
    """Parse an ISO date string (YYYY-MM-DD) into a timezone-aware datetime."""
    if not value:
        return default
    try:
        dt = datetime.strptime(value, "%Y-%m-%d")
        return dt.replace(tzinfo=timezone.utc)
    except ValueError:
        try:
            dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
            return dt
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid date format: '{value}'. Expected YYYY-MM-DD.",
            )


def _build_date_query(date_from: datetime | None, date_to: datetime | None) -> dict:
    """Build a MongoDB date range filter for created_at."""
    if not date_from and not date_to:
        return {}
    q = {}
    if date_from:
        q["$gte"] = date_from
    if date_to:
        # Include the entire end date (up to 23:59:59.999)
        q["$lte"] = date_to.replace(hour=23, minute=59, second=59, microsecond=999999)
    return {"created_at": q}


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/export/predictions")
async def export_all_predictions(
    format: str = Query("csv", description="Export format: 'csv' or 'json'"),
    disease: str = Query(None, description="Filter by disease (optional)"),
    date_from: str = Query(None, description="Start date (YYYY-MM-DD)"),
    date_to: str = Query(None, description="End date (YYYY-MM-DD)"),
    current_user: dict = Depends(require_auth),
):
    """
    Export the authenticated user's prediction history as CSV or JSON.
    Supports date range and disease filters.
    """
    db = get_db()
    fmt = _validate_format(format)

    query: dict = {"user_id": current_user["sub"]}
    if disease:
        query["disease"] = disease.lower()

    # Apply date range filter
    df = _parse_date(date_from)
    dt = _parse_date(date_to)
    date_filter = _build_date_query(df, dt)
    if date_filter:
        query.update(date_filter)

    cursor = db.predictions.find(query).sort("created_at", -1)
    docs = await cursor.to_list(length=10_000)

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


@router.get("/export/predictions/pdf")
async def export_pdf_report(
    disease: str = Query(None, description="Filter by disease (optional)"),
    date_from: str = Query(None, description="Start date (YYYY-MM-DD)"),
    date_to: str = Query(None, description="End date (YYYY-MM-DD)"),
    current_user: dict = Depends(require_auth),
):
    """
    Generate a professional PDF report of the user's prediction history.
    Each prediction gets its own page. Supports date range and disease filters.
    Defaults to last 7 days if no dates provided.

    NOTE: This route MUST be declared before /export/predictions/{prediction_id}
    so FastAPI does not match the literal string 'pdf' as a path parameter.
    """
    db = get_db()

    # Parse dates — default to last 7 days if neither is provided
    df = _parse_date(date_from)
    dt = _parse_date(date_to)

    if df is None and dt is None:
        dt = datetime.now(timezone.utc)
        df = dt - timedelta(days=7)

    query: dict = {"user_id": current_user["sub"]}
    if disease:
        query["disease"] = disease.lower()

    date_filter = _build_date_query(df, dt)
    if date_filter:
        query.update(date_filter)

    cursor = db.predictions.find(query).sort("created_at", -1)
    docs = await cursor.to_list(length=5_000)

    # Fetch user details for the cover page
    try:
        from bson import ObjectId as _OID
        user_doc = await db.users.find_one(
            {"_id": _OID(current_user["sub"])},
            {"name": 1, "email": 1},
        )
    except Exception:
        user_doc = {}

    # ── Fetch Grad-CAM bytes for image predictions ────────────────────────────
    from motor.motor_asyncio import AsyncIOMotorGridFSBucket

    image_predictions = []
    for doc in docs:
        if doc.get("input_type") != "image":
            continue
        gradcam_ref = doc.get("gradcam_ref")
        gradcam_bytes = None
        if gradcam_ref:
            try:
                fs = AsyncIOMotorGridFSBucket(db, bucket_name="gradcam_overlays")
                grid_out = await fs.open_download_stream(ObjectId(gradcam_ref))
                gradcam_bytes = await grid_out.read()
            except Exception:
                gradcam_bytes = None

        image_predictions.append({
            "disease":           doc.get("disease", ""),
            "prediction_label":  doc.get("prediction_label", ""),
            "confidence":        doc.get("ensemble_probability"),
            "risk_level":        doc.get("ensemble_risk_level", ""),
            "all_classes":       doc.get("all_classes", []),
            "created_at":        doc.get("created_at"),
            "gradcam_bytes":     gradcam_bytes,
        })

    pdf_bytes = build_prediction_report(
        predictions=docs,
        user_name=user_doc.get("name", current_user.get("name", "")),
        user_email=user_doc.get("email", current_user.get("email", "")),
        disease_filter=disease or None,
        image_predictions=image_predictions,
        date_from=df,
        date_to=dt,
    )

    timestamp = _timestamp()
    disease_tag = f"_{disease}" if disease else ""
    filename = f"tracehealth_report{disease_tag}_{timestamp}.pdf"

    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
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
