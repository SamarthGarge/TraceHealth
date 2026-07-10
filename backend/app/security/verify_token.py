"""
Verifies bearer tokens issued by the auth-service (Better Auth), via its JWKS
endpoint. FastAPI never issues or stores credentials — see
docs/Auth_Service_Architecture.md for the full rationale.
"""
import httpx
from jose import jwt
from functools import lru_cache
from app.config import settings

JWKS_URL = f"{settings.AUTH_SERVICE_URL}/api/auth/jwks"


@lru_cache(maxsize=1)
def get_jwks():
    return httpx.get(JWKS_URL, timeout=5).json()


def verify_bearer_token(token: str) -> dict:
    """Returns the verified token payload (sub, email, consentDataStorage, role, ...).
    Raises on invalid/expired/unverifiable tokens — callers should treat any
    exception as 401, never as an implicit 'unauthenticated but allowed' state."""
    jwks = get_jwks()
    payload = jwt.decode(
        token,
        jwks,
        algorithms=["RS256"],
        audience=settings.AUTH_SERVICE_URL,
    )
    return payload
