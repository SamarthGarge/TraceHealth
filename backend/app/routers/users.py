"""
User profile endpoints (distinct from auth endpoints).
GET /api/users/me — alias kept for backward compat; main definition is in auth.py.
DELETE /api/users/me — account deletion.
PATCH /api/users/me — profile update (name, consent toggle).
"""
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Response, status
from pydantic import BaseModel

from app.db import get_db
from app.models.user import UserOut
from app.security.dependencies import require_auth

router = APIRouter()


class ProfileUpdateRequest(BaseModel):
    name: str | None = None
    consentDataStorage: bool | None = None


@router.patch("/users/me", response_model=UserOut)
async def update_profile(
    body: ProfileUpdateRequest,
    current_user: dict = Depends(require_auth),
):
    """Update name and/or data-storage consent flag."""
    db = get_db()
    update_fields: dict = {"updatedAt": datetime.now(timezone.utc)}
    if body.name is not None:
        update_fields["name"] = body.name
    if body.consentDataStorage is not None:
        update_fields["consentDataStorage"] = body.consentDataStorage

    from bson import ObjectId
    user = await db.users.find_one_and_update(
        {"_id": ObjectId(current_user["sub"])},
        {"$set": update_fields},
        return_document=True,
    )
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    return UserOut(
        id=str(user["_id"]),
        name=user.get("name", ""),
        email=user["email"],
        role=user.get("role", "user"),
        consentDataStorage=bool(user.get("consentDataStorage", False)),
        createdAt=user.get("createdAt"),
    )


@router.delete("/users/me", status_code=status.HTTP_204_NO_CONTENT)
async def delete_account(response: Response, current_user: dict = Depends(require_auth)):
    """
    Permanently deletes the user's account and all their predictions.
    Clears auth cookies so the client is immediately logged out.
    """
    from bson import ObjectId
    user_id = ObjectId(current_user["sub"])
    db = get_db()

    await db.users.delete_one({"_id": user_id})
    await db.predictions.delete_many({"userId": user_id})

    # Clear cookies
    _cookie_opts = dict(httponly=True, samesite="lax")
    response.delete_cookie("access_token", **_cookie_opts)
    response.delete_cookie("refresh_token", **_cookie_opts)
