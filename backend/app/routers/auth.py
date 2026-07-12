"""
Auth router — all authentication endpoints.
No external auth-service. Everything is handled here.

Endpoints:
  POST /api/auth/signup          — email/password registration
  POST /api/auth/login           — email/password login
  POST /api/auth/logout          — clears auth cookies
  GET  /api/auth/me              — returns current user profile
  POST /api/auth/refresh         — issues a new access token from refresh cookie
  GET  /api/auth/google          — starts Google OAuth redirect
  GET  /api/auth/google/callback — Google OAuth callback, sets cookies
"""
import secrets
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from fastapi.responses import RedirectResponse

from app.config import settings
from app.core.jwt import (
    create_access_token,
    create_refresh_token,
    verify_refresh_token,
)
from app.core.password import hash_password, verify_password
from app.db import get_db
from app.models.user import LoginRequest, SignupRequest, TokenResponse, UserOut
from app.security.dependencies import require_auth
from app.utils.logging import get_logger

logger = get_logger(__name__)
router = APIRouter()

# ── Cookie helpers ─────────────────────────────────────────────────────────────

_COOKIE_OPTS = dict(
    httponly=True,
    samesite="lax",
    secure=settings.cookie_secure,  # True in production (HTTPS), False in dev
)

ACCESS_COOKIE = "access_token"
REFRESH_COOKIE = "refresh_token"


def _set_auth_cookies(response: Response, user: dict) -> tuple[str, str]:
    """Creates tokens and sets them as httpOnly cookies on the response."""
    access = create_access_token(
        user_id=str(user["_id"]),
        email=user["email"],
        name=user.get("name", ""),
        role=user.get("role", "user"),
        consent=bool(user.get("consentDataStorage", False)),
    )
    refresh = create_refresh_token(user_id=str(user["_id"]))

    response.set_cookie(
        ACCESS_COOKIE,
        access,
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        **_COOKIE_OPTS,
    )
    response.set_cookie(
        REFRESH_COOKIE,
        refresh,
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 86_400,
        **_COOKIE_OPTS,
    )
    return access, refresh


def _clear_auth_cookies(response: Response) -> None:
    response.delete_cookie(ACCESS_COOKIE, **_COOKIE_OPTS)
    response.delete_cookie(REFRESH_COOKIE, **_COOKIE_OPTS)


def _user_to_out(user: dict) -> UserOut:
    return UserOut(
        id=str(user["_id"]),
        name=user.get("name", ""),
        email=user["email"],
        role=user.get("role", "user"),
        consentDataStorage=bool(user.get("consentDataStorage", False)),
        createdAt=user.get("createdAt"),
    )


# ── Email / Password ───────────────────────────────────────────────────────────

@router.post("/auth/signup", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def signup(body: SignupRequest, response: Response):
    """Register a new user with email, password, and data-storage consent."""
    db = get_db()

    if await db.users.find_one({"email": body.email}):
        # Generic message — never confirm whether an email is registered
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Could not create account. Please check your details.",
        )

    now = datetime.now(timezone.utc)
    doc = {
        "name": body.name,
        "email": body.email,
        "password_hash": hash_password(body.password),
        "role": "user",
        "consentDataStorage": body.consentDataStorage,
        "provider": "email",
        "createdAt": now,
        "updatedAt": now,
    }
    result = await db.users.insert_one(doc)
    doc["_id"] = result.inserted_id

    _set_auth_cookies(response, doc)
    logger.info("New user registered: %s", body.email)
    return TokenResponse(user=_user_to_out(doc))


@router.post("/auth/login", response_model=TokenResponse)
async def login(body: LoginRequest, response: Response):
    """Authenticate with email and password."""
    db = get_db()
    user = await db.users.find_one({"email": body.email})

    # Constant-time comparison — always hash even if user not found
    dummy_hash = "$2b$12$placeholderplaceholderplaceholderplaceholderplaceholderp"
    stored_hash = user["password_hash"] if user else dummy_hash

    if not verify_password(body.password, stored_hash) or not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )

    if user.get("provider") == "google":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This account uses Google Sign-In. Please use the Google button.",
        )

    _set_auth_cookies(response, user)
    return TokenResponse(user=_user_to_out(user))


@router.post("/auth/logout")
async def logout(response: Response):
    """Clears auth cookies. Stateless — no server-side session to invalidate."""
    _clear_auth_cookies(response)
    return {"message": "Logged out."}


@router.get("/auth/me", response_model=UserOut)
async def get_me(current_user: dict = Depends(require_auth)):
    """Returns the current user's profile from the verified access token."""
    return UserOut(
        id=current_user["sub"],
        name=current_user.get("name", ""),
        email=current_user.get("email", ""),
        role=current_user.get("role", "user"),
        consentDataStorage=bool(current_user.get("consentDataStorage", False)),
    )


@router.post("/auth/refresh", response_model=TokenResponse)
async def refresh_token(request: Request, response: Response):
    """
    Issues a new access token (+ refresh token) from a valid refresh cookie.
    Called automatically by the frontend Axios interceptor on 401 responses.
    """
    raw = request.cookies.get(REFRESH_COOKIE)
    if not raw:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="No refresh token.")

    try:
        payload = verify_refresh_token(raw)
    except Exception:
        _clear_auth_cookies(response)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token expired.")

    db = get_db()
    user = await db.users.find_one({"_id": payload["sub"]})
    if not user:
        _clear_auth_cookies(response)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found.")

    _set_auth_cookies(response, user)
    return TokenResponse(user=_user_to_out(user))


# ── Google OAuth ───────────────────────────────────────────────────────────────

@router.get("/auth/google")
async def google_login():
    """Redirects to Google's OAuth consent screen."""
    if not settings.GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=501, detail="Google OAuth is not configured.")

    import httpx
    params = {
        "client_id": settings.GOOGLE_CLIENT_ID,
        "redirect_uri": settings.GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope": "openid email profile",
        "access_type": "offline",
        "prompt": "select_account",
        "state": secrets.token_urlsafe(16),  # CSRF protection
    }
    query = "&".join(f"{k}={v}" for k, v in params.items())
    return RedirectResponse(f"https://accounts.google.com/o/oauth2/v2/auth?{query}")


@router.get("/auth/google/callback")
async def google_callback(code: str, response: Response):
    """
    Receives the auth code from Google, exchanges it for user info,
    upserts the user in MongoDB, and sets auth cookies.
    """
    if not settings.GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=501, detail="Google OAuth is not configured.")

    import httpx

    # 1. Exchange code for tokens
    async with httpx.AsyncClient() as client:
        token_resp = await client.post(
            "https://oauth2.googleapis.com/token",
            data={
                "code": code,
                "client_id": settings.GOOGLE_CLIENT_ID,
                "client_secret": settings.GOOGLE_CLIENT_SECRET,
                "redirect_uri": settings.GOOGLE_REDIRECT_URI,
                "grant_type": "authorization_code",
            },
        )
        if token_resp.status_code != 200:
            raise HTTPException(status_code=400, detail="Failed to exchange OAuth code.")
        token_data = token_resp.json()

        # 2. Fetch user info
        userinfo_resp = await client.get(
            "https://www.googleapis.com/oauth2/v3/userinfo",
            headers={"Authorization": f"Bearer {token_data['access_token']}"},
        )
        if userinfo_resp.status_code != 200:
            raise HTTPException(status_code=400, detail="Failed to fetch Google user info.")
        guser = userinfo_resp.json()

    # 3. Upsert user in MongoDB
    db = get_db()
    now = datetime.now(timezone.utc)
    update = {
        "$set": {
            "name": guser.get("name", ""),
            "email": guser["email"],
            "provider": "google",
            "googleId": guser["sub"],
            "updatedAt": now,
        },
        "$setOnInsert": {
            "role": "user",
            "consentDataStorage": True,  # Google users implicitly consent via Google TOS
            "createdAt": now,
        },
    }
    result = await db.users.find_one_and_update(
        {"email": guser["email"]},
        update,
        upsert=True,
        return_document=True,
    )

    _set_auth_cookies(response, result)
    # Redirect back to the frontend dashboard after OAuth
    return RedirectResponse(f"{settings.FRONTEND_ORIGIN}/dashboard")
