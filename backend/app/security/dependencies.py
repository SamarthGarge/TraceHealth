"""
FastAPI dependencies for authentication and authorization.

Token source (in priority order):
  1. httpOnly cookie "access_token"  — browser clients (preferred, XSS-safe)
  2. Authorization: Bearer <token>   — API clients / testing

This module no longer calls an external auth-service.
All JWT verification is done locally via app.core.jwt.
"""
from fastapi import Cookie, Depends, HTTPException, Request, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError

from app.core.jwt import verify_access_token
from app.utils.logging import get_logger

logger = get_logger(__name__)
bearer_scheme = HTTPBearer(auto_error=False)


def _resolve_token(
    access_token: str | None,
    credentials: HTTPAuthorizationCredentials | None,
) -> dict | None:
    """
    Extracts and verifies the access token from either a cookie or a Bearer header.
    Returns the payload dict, or None if no token is present at all.
    Raises 401 if a token IS present but is invalid / expired.
    """
    raw_token: str | None = None

    if access_token:
        raw_token = access_token
    elif credentials:
        raw_token = credentials.credentials

    if raw_token is None:
        return None

    try:
        return verify_access_token(raw_token)
    except JWTError as exc:
        logger.warning("Token verification failed: %s", type(exc).__name__)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token.",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def get_current_user(
    access_token: str | None = Cookie(default=None),
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> dict | None:
    """
    Optional authentication — returns payload or None.
    Use for routes that work for both guests and logged-in users
    (e.g., POST /api/predict — predictions work for everyone,
    but are only persisted for consented, logged-in users).
    """
    return _resolve_token(access_token, credentials)


async def require_auth(
    access_token: str | None = Cookie(default=None),
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> dict:
    """
    Mandatory authentication — returns payload or raises 401.
    Use for routes that must be gated (history, profile, uploads, export).
    """
    user = _resolve_token(access_token, credentials)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


async def require_admin(
    current_user: dict = Depends(require_auth),
) -> dict:
    """
    Admin role gate — additive to require_auth.
    Returns 404 (not 403) to avoid confirming the route exists for non-admins.
    """
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found.")
    return current_user


def user_has_consented(user: dict) -> bool:
    """
    Checks the consentDataStorage claim. Fails closed (False) if missing.
    Called before persisting any prediction to the database.
    """
    return bool(user.get("consentDataStorage", False))
