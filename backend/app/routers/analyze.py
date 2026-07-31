"""
Analyze router — AI-powered medical report analysis.

Endpoint:
  POST /api/uploads/{file_id}/analyze
    — Fetches the file from GridFS, extracts text via OCR (pytesseract / pdfplumber),
      and returns structured health insights with dietary recommendations.

Security:
  - Requires authentication.
  - Ownership check — users can only analyze their own uploads.
  - Only PDF, PNG, and JPEG files are processed (CSV analysis is not supported).
  - Processing is CPU-bound and runs synchronously in a thread pool to avoid blocking
    the async event loop.
"""
import io
from concurrent.futures import ThreadPoolExecutor

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.concurrency import run_in_threadpool

from app.db import get_db, get_gridfs
from app.security.dependencies import require_auth
from app.utils.logging import get_logger
from app.utils.report_analyzer import extract_text_from_bytes, generate_analysis

router = APIRouter()
logger = get_logger(__name__)

# File types supported for analysis (CSV has no OCR-able content)
ANALYZABLE_TYPES = {"application/pdf", "image/png", "image/jpeg"}


@router.post("/uploads/{file_id}/analyze", tags=["Uploads"])
async def analyze_upload(
    file_id: str,
    current_user: dict = Depends(require_auth),
):
    """
    Analyze an uploaded medical report using OCR + rule-based health insights.

    - Extracts text from PDF or image files using pytesseract / pdfplumber.
    - Identifies common health markers (glucose, HbA1c, cholesterol, hemoglobin, etc.).
    - Returns personalised dietary and lifestyle recommendations.
    - No data is stored — analysis is performed on-the-fly.
    """
    db = get_db()
    gridfs = get_gridfs()

    # ── Validate and parse the file_id ─────────────────────────────────────────
    try:
        oid = ObjectId(file_id)
    except (InvalidId, TypeError):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found.")

    # ── Ownership check ────────────────────────────────────────────────────────
    meta = await db.uploads.find_one({"file_id": oid, "user_id": current_user["sub"]})
    if not meta:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found.")

    # ── Content type check ─────────────────────────────────────────────────────
    content_type = meta.get("content_type", "")
    if content_type not in ANALYZABLE_TYPES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Only PDF and image files (PNG, JPEG) can be analyzed. CSV files are not supported.",
        )

    # ── Read file from GridFS ──────────────────────────────────────────────────
    try:
        grid_out = await gridfs.open_download_stream(oid)
        file_bytes = await grid_out.read()
    except Exception as exc:
        logger.error("GridFS read failed for file %s: %s", file_id, exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to read file. Please try again.",
        )

    # ── OCR + Analysis (runs in thread pool — CPU-bound) ──────────────────────
    try:
        def _run_analysis():
            text = extract_text_from_bytes(file_bytes, content_type)
            return text, generate_analysis(text)

        extracted_text, analysis = await run_in_threadpool(_run_analysis)
    except Exception as exc:
        logger.error("Report analysis failed for file %s: %s", file_id, exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Analysis failed. Ensure the file contains readable text and try again.",
        )

    logger.info(
        "Report analyzed: file=%s user=%s markers=%d",
        file_id, current_user["sub"], analysis.get("markers_detected", 0),
    )

    return {
        "file_id":        file_id,
        "filename":       meta.get("filename", ""),
        "content_type":   content_type,
        "text_extracted": bool(extracted_text.strip()),
        "character_count": len(extracted_text),
        # First 800 chars — helps debug when markers aren't detected
        "text_preview":   extracted_text[:800].strip() if extracted_text else "",
        **analysis,
    }
