"""
MongoDB Motor async client, GridFS bucket, and startup index creation.
See docs/TRD.md §4.5 for the full index design rationale.
"""
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorGridFSBucket
from pymongo import ASCENDING
from app.config import settings

_client: AsyncIOMotorClient | None = None
_db = None
_gridfs: AsyncIOMotorGridFSBucket | None = None


def get_client() -> AsyncIOMotorClient:
    if _client is None:
        raise RuntimeError("Database client not initialized. Call init_db() first.")
    return _client


def get_db():
    if _db is None:
        raise RuntimeError("Database not initialized. Call init_db() first.")
    return _db


def get_gridfs() -> AsyncIOMotorGridFSBucket:
    if _gridfs is None:
        raise RuntimeError("GridFS not initialized. Call init_db() first.")
    return _gridfs


async def init_db() -> None:
    """Connect to MongoDB and create required indexes. Called at app startup."""
    global _client, _db, _gridfs

    _client = AsyncIOMotorClient(settings.MONGO_URI)
    _db = _client[settings.MONGO_DB_NAME]
    _gridfs = AsyncIOMotorGridFSBucket(_db, bucket_name="uploads")

    await _create_indexes()
    await _seed_model_metadata()


async def close_db() -> None:
    """Close MongoDB connection. Called at app shutdown."""
    global _client
    if _client is not None:
        _client.close()
        _client = None


async def _create_indexes() -> None:
    """
    Creates indexes specified in TRD v2.0 §4.5.
    All calls are idempotent — safe to call on every startup.
    """
    db = get_db()

    # users.email — unique index (duplicate email enforcement)
    await db.users.create_index("email", unique=True)

    # predictions — compound index for fast per-user history queries sorted by recency
    await db.predictions.create_index(
        [("user_id", ASCENDING), ("created_at", ASCENDING)]
    )

    # uploads — simple index for listing a user's files
    await db.uploads.create_index("user_id")


async def _seed_model_metadata() -> None:
    """
    Seeds the model_metadata collection from models/model_metadata.json on first run.
    Skips if the collection already has documents (idempotent).
    """
    import json
    import os

    db = get_db()
    count = await db.model_metadata.count_documents({})
    if count > 0:
        return  # Already seeded

    metadata_path = os.path.join(
        os.path.dirname(__file__), "..", "..", settings.MODELS_DIR, "model_metadata.json"
    )
    metadata_path = os.path.normpath(metadata_path)

    if not os.path.exists(metadata_path):
        return  # No metadata file yet — skip silently (training not run)

    with open(metadata_path, "r") as f:
        data = json.load(f)

    if isinstance(data, list) and data:
        await db.model_metadata.insert_many(data)
    elif isinstance(data, dict):
        # Support both list and dict-of-diseases formats
        docs = [{"disease": k, **v} for k, v in data.items()]
        if docs:
            await db.model_metadata.insert_many(docs)
