"""
JWT creation and verification — entirely self-contained in FastAPI.
Uses HS256 (symmetric) with the JWT_SECRET from config.

Two token types:
  - access  : short-lived (60 min), sent in httpOnly cookie "access_token"
  - refresh : long-lived  (30 days), sent in httpOnly cookie "refresh_token"

The refresh token is stored as a hash in MongoDB so it can be revoked on logout.
"""
from datetime import datetime, timedelta, timezone

from jose import JWTError, jwt

from app.config import settings

ACCESS_TOKEN_TYPE = "access"
REFRESH_TOKEN_TYPE = "refresh"


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


def create_access_token(user_id: str, email: str, name: str, role: str, consent: bool) -> str:
    """Creates a short-lived access JWT containing all fields the app needs."""
    expire = _now_utc() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {
        "sub": user_id,
        "email": email,
        "name": name,
        "role": role,
        "consentDataStorage": consent,
        "type": ACCESS_TOKEN_TYPE,
        "exp": expire,
        "iat": _now_utc(),
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def create_refresh_token(user_id: str) -> str:
    """Creates a long-lived refresh JWT (minimal claims — just sub + type + exp)."""
    expire = _now_utc() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    payload = {
        "sub": user_id,
        "type": REFRESH_TOKEN_TYPE,
        "exp": expire,
        "iat": _now_utc(),
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def decode_token(token: str) -> dict:
    """
    Decodes and verifies a JWT. Raises jose.JWTError on any failure.
    Callers are responsible for catching JWTError.
    """
    return jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])


def verify_access_token(token: str) -> dict:
    """Decodes the token and confirms it is an access token (not a refresh token)."""
    payload = decode_token(token)
    if payload.get("type") != ACCESS_TOKEN_TYPE:
        raise JWTError("Not an access token.")
    return payload


def verify_refresh_token(token: str) -> dict:
    """Decodes the token and confirms it is a refresh token."""
    payload = decode_token(token)
    if payload.get("type") != REFRESH_TOKEN_TYPE:
        raise JWTError("Not a refresh token.")
    return payload


# ── Password reset tokens ─────────────────────────────────────────────────────

RESET_TOKEN_TYPE = "reset"
RESET_TOKEN_EXPIRE_MINUTES = 15


def create_reset_token(user_id: str, email: str) -> str:
    """Creates a short-lived reset JWT (15 min) for password recovery."""
    expire = _now_utc() + timedelta(minutes=RESET_TOKEN_EXPIRE_MINUTES)
    payload = {
        "sub": user_id,
        "email": email,
        "type": RESET_TOKEN_TYPE,
        "exp": expire,
        "iat": _now_utc(),
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def verify_reset_token(token: str) -> dict:
    """Decodes the token and confirms it is a password-reset token."""
    payload = decode_token(token)
    if payload.get("type") != RESET_TOKEN_TYPE:
        raise JWTError("Not a reset token.")
    return payload

