"""
GET /api/auth/me — returns the current user's profile from the verified JWT claims.
FastAPI never queries the database for this — the token payload (issued by the auth-service)
already contains name, email, role, and consentDataStorage.
"""
from fastapi import APIRouter, Depends, HTTPException, status

from app.models.user import UserOut
from app.security.dependencies import require_auth

router = APIRouter()


@router.get("/auth/me", response_model=UserOut)
async def get_me(current_user: dict = Depends(require_auth)) -> UserOut:
    """
    Returns the authenticated user's profile.
    The profile is extracted directly from the verified JWT payload —
    no database round-trip needed for this endpoint.
    """
    try:
        return UserOut(
            id=current_user["sub"],
            name=current_user.get("name", ""),
            email=current_user.get("email", ""),
            role=current_user.get("role", "user"),
            consentDataStorage=bool(current_user.get("consentDataStorage", False)),
        )
    except (KeyError, TypeError) as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token payload is missing required fields.",
        )
