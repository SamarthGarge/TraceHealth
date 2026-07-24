"""
Uploads router — secure file upload/download/delete via MongoDB GridFS.

Security measures (per Backend.md §3.6):
  - Magic-byte validation: file type verified from actual bytes, not client Content-Type
  - Size limit: 10 MB enforced before reading the full file into memory
  - Allow-list: PDF, PNG, JPEG, CSV only
  - Filename sanitization: original name stored as metadata only
  - Ownership: every per-record operation performs ownership-check-then-404

Endpoints:
  POST   /api/uploads            — upload a file (multipart/form-data)
  GET    /api/uploads            — list user's files (paginated, newest first)
  GET    /api/uploads/{file_id}  — stream-download a file
  DELETE /api/uploads/{file_id}  — delete a file
"""

import io
from datetime import datetime, timezone

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from fastapi.responses import StreamingResponse
from pymongo import DESCENDING

from app.db import get_db, get_gridfs
from app.models.upload import UploadItem, UploadListResponse
from app.security.dependencies import require_auth
from app.utils.logging import get_logger

logger = get_logger(__name__)
router = APIRouter()

# ── Constants ─────────────────────────────────────────────────────────────────

MAX_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB

# Magic-byte signatures for allowed file types.
# Each entry: (mime_type, byte_offset, expected_bytes)
# We check the first 12 bytes of the file against these signatures.
MAGIC_SIGNATURES: list[tuple[str, int, bytes]] = [
    ("application/pdf",  0, b"%PDF"),
    ("image/png",        0, b"\x89PNG\r\n\x1a\n"),
    ("image/jpeg",       0, b"\xff\xd8\xff"),
    ("text/csv",         0, None),   # CSV has no magic bytes — allowed by extension only
]

# Allowed extensions for CSV fallback (no magic bytes)
CSV_EXTENSIONS = {".csv"}

# Map detected mime type → human-readable label for error messages
ALLOWED_MIME_TYPES = {"application/pdf", "image/png", "image/jpeg", "text/csv"}


def _detect_content_type(header_bytes: bytes, filename: str) -> str:
    """
    Detect the true content type from the first bytes of a file.

    Returns a MIME type string if the file is on the allow-list.
    Raises HTTPException 415 if the file type is not permitted.

    Args:
        header_bytes: first 12 bytes of the uploaded file
        filename:     original filename (used only for CSV extension check)
    """
    # Check magic bytes for binary types
    if header_bytes[:4] == b"%PDF":
        return "application/pdf"
    if header_bytes[:8] == b"\x89PNG\r\n\x1a\n":
        return "image/png"
    if header_bytes[:3] == b"\xff\xd8\xff":
        return "image/jpeg"

    # CSV: no universal magic — allow only if extension matches and file
    # starts with printable ASCII (heuristic)
    ext = "." + filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if ext in CSV_EXTENSIONS:
        try:
            header_bytes[:12].decode("ascii")
            return "text/csv"
        except (UnicodeDecodeError, ValueError):
            pass  # fall through to rejection

    raise HTTPException(
        status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
        detail=(
            "Unsupported file type. Allowed: PDF, PNG, JPEG, CSV. "
            "File type is verified from file contents, not the filename."
        ),
    )


def _validate_object_id(id_str: str) -> ObjectId:
    """Parse ObjectId string → ObjectId; raises 404 on invalid format."""
    try:
        return ObjectId(id_str)
    except (InvalidId, TypeError):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found.")


def _sanitize_filename(filename: str) -> str:
    """Keep only the basename and strip path traversal characters."""
    import os
    return os.path.basename(filename).strip() or "upload"


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/uploads", status_code=status.HTTP_201_CREATED, response_model=UploadItem)
async def upload_file(
    file: UploadFile = File(..., description="File to upload (PDF, PNG, JPEG, CSV; max 10 MB)"),
    current_user: dict = Depends(require_auth),
):
    """
    Upload a file to the authenticated user's storage.

    Validates content type via magic bytes, enforces 10 MB size limit,
    and stores the file in GridFS.
    """
    db = get_db()
    gridfs = get_gridfs()

    safe_filename = _sanitize_filename(file.filename or "upload")

    # Read the file in chunks, enforcing the size limit before loading into memory
    chunks: list[bytes] = []
    total_size = 0

    # First read the magic-byte header (up to 12 bytes)
    header = await file.read(12)
    if not header:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Empty file.")

    # Detect content type from magic bytes
    detected_type = _detect_content_type(header, safe_filename)

    # Continue reading the rest of the file, enforcing size limit
    chunks.append(header)
    total_size += len(header)

    while True:
        chunk = await file.read(65536)  # 64 KB chunks
        if not chunk:
            break
        total_size += len(chunk)
        if total_size > MAX_SIZE_BYTES:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"File too large. Maximum allowed size is {MAX_SIZE_BYTES // (1024*1024)} MB.",
            )
        chunks.append(chunk)

    file_bytes = b"".join(chunks)

    # Store in GridFS
    file_id = await gridfs.upload_from_stream(
        safe_filename,
        io.BytesIO(file_bytes),
        metadata={
            "user_id":      current_user["sub"],
            "content_type": detected_type,
            "size":         total_size,
            "created_at":   datetime.now(timezone.utc),
        },
    )

    # Also insert a reference doc in the uploads collection for fast queries
    doc = {
        "file_id":      file_id,
        "user_id":      current_user["sub"],
        "filename":     safe_filename,
        "content_type": detected_type,
        "size":         total_size,
        "created_at":   datetime.now(timezone.utc),
    }
    await db.uploads.insert_one(doc)

    logger.info("Upload stored: %s (%s, %d bytes) for user %s", safe_filename, detected_type, total_size, current_user["sub"])

    return UploadItem(
        id=str(file_id),
        filename=safe_filename,
        content_type=detected_type,
        size=total_size,
        created_at=doc["created_at"].isoformat(),
    )


@router.get("/uploads", response_model=UploadListResponse)
async def list_uploads(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    current_user: dict = Depends(require_auth),
):
    """List the authenticated user's uploaded files, newest first."""
    db = get_db()
    query = {"user_id": current_user["sub"]}

    total = await db.uploads.count_documents(query)
    cursor = db.uploads.find(query).sort("created_at", DESCENDING).skip(skip).limit(limit)
    docs = await cursor.to_list(length=limit)

    items = [
        UploadItem(
            id=str(doc["file_id"]),
            filename=doc["filename"],
            content_type=doc["content_type"],
            size=doc["size"],
            created_at=doc["created_at"].isoformat() if doc.get("created_at") else "",
        )
        for doc in docs
    ]

    return UploadListResponse(items=items, total=total, skip=skip, limit=limit)


@router.get("/uploads/{file_id}")
async def download_file(
    file_id: str,
    current_user: dict = Depends(require_auth),
):
    """
    Stream-download a file by its GridFS ID.
    Performs ownership check before returning the file.
    """
    db = get_db()
    gridfs = get_gridfs()

    oid = _validate_object_id(file_id)

    # Ownership check via the uploads metadata collection (fast, indexed)
    meta = await db.uploads.find_one({"file_id": oid, "user_id": current_user["sub"]})
    if not meta:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found.")

    # Stream from GridFS
    grid_out = await gridfs.open_download_stream(oid)
    content = await grid_out.read()

    return StreamingResponse(
        io.BytesIO(content),
        media_type=meta["content_type"],
        headers={
            "Content-Disposition": f'attachment; filename="{meta["filename"]}"',
            "Content-Length": str(meta["size"]),
        },
    )


@router.delete("/uploads/{file_id}", status_code=status.HTTP_200_OK)
async def delete_file(
    file_id: str,
    current_user: dict = Depends(require_auth),
):
    """
    Delete a file from GridFS and the uploads metadata collection.
    Ownership-check-then-404: returns 404 if the file doesn't exist
    or doesn't belong to the authenticated user.
    """
    db = get_db()
    gridfs = get_gridfs()

    oid = _validate_object_id(file_id)

    # Ownership check
    meta = await db.uploads.find_one({"file_id": oid, "user_id": current_user["sub"]})
    if not meta:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found.")

    # Delete from GridFS
    await gridfs.delete(oid)

    # Delete metadata doc
    await db.uploads.delete_one({"file_id": oid, "user_id": current_user["sub"]})

    logger.info("Upload deleted: %s by user %s", file_id, current_user["sub"])
    return {"message": "File deleted."}
