"""
FastAPI dependencies for authentication and authorization.
See docs/Auth_Service_Architecture.md §4.2 for the JWKS verification rationale.
"""
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError

from app.security.verify_token import verify_bearer_token
from app.utils.logging import get_logger

logger = get_logger(__name__)
bearer_scheme = HTTPBearer(auto_error=False)


def _extract_user_from_token(credentials: HTTPAuthorizationCredentials | None) -> dict | None:
    """
    Verifies the bearer token via the auth-service JWKS endpoint.
    Returns the token payload dict on success, or None if no token present.
    Raises 401 if a token IS present but invalid/expired.
    """
    if credentials is None:
        return None

    try:
        payload = verify_bearer_token(credentials.credentials)
        return payload
    except JWTError as e:
        logger.warning("Token verification failed: %s", type(e).__name__)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except Exception as e:
        logger.error("Unexpected error during token verification: %s", type(e).__name__)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials.",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> dict | None:
    """
    Optional authentication dependency.
    Returns the verified token payload if authenticated, None if no token.
    Use for routes that work for both guests and logged-in users
    (e.g., POST /api/predict/{disease} — prediction works for everyone,
    but only persists for logged-in users who have consented).
    """
    return _extract_user_from_token(credentials)


async def require_auth(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> dict:
    """
    Mandatory authentication dependency.
    Returns the verified token payload or raises 401.
    Use for routes that must be gated (history, uploads, profile, etc.).
    """
    user = _extract_user_from_token(credentials)
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
    Admin role dependency — additive to require_auth, never a replacement.
    Returns the verified token payload if the user has role='admin'.
    Raises 404 (not 403) to avoid confirming the route exists for non-admin users.
    See Backend doc §4.3 and Full-Scope Expansion §2.7.
    """
    role = current_user.get("role", "user")
    if role != "admin":
        # 404 is intentional — consistent with the ownership-check-then-404 pattern
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found.")
    return current_user


def user_has_consented(user: dict) -> bool:
    """
    Helper to check the consentDataStorage claim from the verified token.
    Fails closed (returns False) if the field is missing or falsy.
    FastAPI's prediction-saving logic calls this before persisting anything.
    """
    return bool(user.get("consentDataStorage", False))
