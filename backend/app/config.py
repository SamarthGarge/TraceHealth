"""
Backend application settings loaded from environment variables via pydantic-settings.
See backend/.env.example for all required keys.
"""
from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # --- MongoDB ---
    MONGO_URI: str
    MONGO_DB_NAME: str = "healthrisk"

    # --- JWT (issued and verified entirely by this FastAPI app) ---
    JWT_SECRET: str                     # long random secret — used to sign HS256 tokens
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60        # 1 hour
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30          # 30-day sliding refresh

    # --- Admin account (seeded via POST /api/auth/admin/setup) ---
    ADMIN_EMAIL: str = ""
    ADMIN_PASSWORD: str = ""

    # --- Google OAuth ---
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    # Redirect URI registered in GCP — must match exactly
    GOOGLE_REDIRECT_URI: str = "http://localhost:8000/api/auth/google/callback"

    # --- SMTP (Gmail for password reset emails) ---
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""                          # e.g. tracehealth.noreply@gmail.com
    SMTP_PASSWORD: str = ""                      # Gmail App Password (16 chars)
    SMTP_FROM_NAME: str = "TraceHealth"

    # --- App ---
    FRONTEND_ORIGIN: str = "http://localhost:5173"
    ENVIRONMENT: str = "development"   # "development" | "production"

    # --- CORS ---
    # Comma-separated list of additional allowed origins (e.g., staging URLs)
    EXTRA_ALLOWED_ORIGINS: str = ""

    # --- Models ---
    MODELS_DIR: str = "../models"   # relative to backend root

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8-sig",  # handles BOM from Windows editors
        case_sensitive=True,
        extra="ignore",
    )

    @property
    def allowed_origins(self) -> list[str]:
        origins = [self.FRONTEND_ORIGIN]
        if self.EXTRA_ALLOWED_ORIGINS:
            origins.extend(
                o.strip() for o in self.EXTRA_ALLOWED_ORIGINS.split(",") if o.strip()
            )
        return origins

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT == "production"

    @property
    def cookie_secure(self) -> bool:
        """httpOnly cookies need Secure flag in production (HTTPS only)."""
        return self.is_production


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
