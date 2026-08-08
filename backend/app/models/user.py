"""
User-related Pydantic schemas.
password_hash is NEVER included in any response model.
"""
from pydantic import BaseModel, EmailStr, ConfigDict, Field
from typing import Optional
from datetime import datetime


# ── Response model (safe — no secrets) ────────────────────────────────────────
class UserOut(BaseModel):
    """Safe user representation returned to the client. No sensitive fields."""
    id: str
    name: str
    email: EmailStr
    role: str = "user"
    consentDataStorage: bool = False
    createdAt: Optional[datetime] = None

    model_config = ConfigDict(populate_by_name=True)


# ── Auth request schemas ───────────────────────────────────────────────────────
class SignupRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=80)
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)
    consentDataStorage: bool


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=1)


# ── Token response (returned in body AND set as httpOnly cookie) ───────────────
class TokenResponse(BaseModel):
    """Returned on login/signup so the frontend can read the user object."""
    user: UserOut
    message: str = "ok"


# ── Password reset schemas ─────────────────────────────────────────────────────
class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str = Field(..., min_length=10)
    new_password: str = Field(..., min_length=8, max_length=128)

