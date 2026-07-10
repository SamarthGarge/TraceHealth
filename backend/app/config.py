"""
Backend application settings loaded from environment variables via pydantic-settings.
See backend/.env.example for all required keys.
"""
from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # --- Auth service ---
    AUTH_SERVICE_URL: str  # e.g. http://localhost:4000

    # --- MongoDB ---
    MONGO_URI: str
    MONGO_DB_NAME: str = "healthrisk"

    # --- App ---
    FRONTEND_ORIGIN: str = "http://localhost:5173"
    ENVIRONMENT: str = "development"  # "development" | "production"

    # --- CORS ---
    # Comma-separated list of allowed origins (in addition to FRONTEND_ORIGIN)
    EXTRA_ALLOWED_ORIGINS: str = ""

    # --- Models ---
    MODELS_DIR: str = "../../models"  # relative to backend root

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8-sig",  # utf-8-sig handles BOM from Windows tools
        case_sensitive=True,
        extra="ignore",  # ignore extra env vars that may exist in the environment
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


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
