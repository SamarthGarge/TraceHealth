"""
Pydantic schemas for the file upload API.
"""

from pydantic import BaseModel, Field


class UploadItem(BaseModel):
    """Metadata for a single uploaded file (list + detail view)."""
    id: str = Field(description="GridFS file ID (ObjectId string)")
    filename: str = Field(description="Original filename as supplied by the client")
    content_type: str = Field(description="Validated MIME type (not client-supplied)")
    size: int = Field(description="File size in bytes")
    created_at: str = Field(description="ISO-8601 upload timestamp")


class UploadListResponse(BaseModel):
    """Paginated list of uploads for the authenticated user."""
    items: list[UploadItem]
    total: int
    skip: int
    limit: int
