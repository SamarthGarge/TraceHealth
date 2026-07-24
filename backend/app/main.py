"""
FastAPI application entry point.
Configures middleware, mounts all routers, and manages app lifespan (DB + model loading).
See docs/Backend.md §2 for the full application structure.
"""
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.db import init_db, close_db
from app.middleware.rate_limit import limiter, rate_limit_handler
from app.middleware.security_headers import SecurityHeadersMiddleware
from app.utils.logging import setup_logging
from slowapi.errors import RateLimitExceeded

# Routers — imported here; implemented progressively per phase
from app.routers import models_info
from app.routers import auth      # signup, login, logout, /me, Google OAuth
from app.routers import users     # profile update, account deletion

# Phase 3 -- Predictions & History
from app.routers import predict, history
# Phase 5 -- File Uploads
from app.routers import uploads
# Phase 9+
# from app.routers import export
# Phase 10+
# from app.routers import admin
# Phase 7+
# from app.routers import symptom_check


setup_logging()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup: connect DB, load models. Shutdown: close DB."""
    await init_db()

    # Load ML models into memory at startup so predictions never pay disk I/O
    from app.core.model_loader import load_all_models
    load_all_models()

    yield

    await close_db()


app = FastAPI(
    title="TraceHealth API",
    version="2.0.0",
    description=(
        "HealthRisk Predictor — ML-powered disease risk screening with explainability. "
        "EDUCATIONAL TOOL ONLY. Not a medical diagnosis."
    ),
    # Disable the built-in docs endpoints — they load assets from jsDelivr CDN
    # which can be blocked on some networks. We serve custom endpoints below
    # that use unpkg (more reliable) and also work behind strict CSPs.
    docs_url=None,
    redoc_url=None,
    lifespan=lifespan,
)

# ── Middleware (order matters — outermost first) ──────────────────────────────

# CORS — allow only configured origin(s)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security response headers (X-Frame-Options, HSTS, CSP, etc.)
app.add_middleware(SecurityHeadersMiddleware)

# Rate limiter state
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, rate_limit_handler)

# ── Routes ────────────────────────────────────────────────────────────────────

@app.get("/health", tags=["System"])
async def health_check():
    """Liveness probe — used by deployment platforms and local dev verification."""
    return {"status": "ok", "service": "tracehealth-api"}


# ── API Docs (custom endpoints using unpkg CDN — avoids jsDelivr blocks) ─────
# Only available in development. Disabled entirely in production.
if not settings.is_production:
    from fastapi.openapi.docs import get_swagger_ui_html, get_redoc_html

    @app.get("/docs", include_in_schema=False)
    async def swagger_ui():
        return get_swagger_ui_html(
            openapi_url="/openapi.json",
            title="TraceHealth API — Swagger UI",
            swagger_js_url="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js",
            swagger_css_url="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css",
            swagger_ui_parameters={"persistAuthorization": True},
        )

    @app.get("/redoc", include_in_schema=False)
    async def redoc_ui():
        return get_redoc_html(
            openapi_url="/openapi.json",
            title="TraceHealth API — ReDoc",
            redoc_js_url="https://unpkg.com/redoc@latest/bundles/redoc.standalone.js",
        )

app.include_router(auth.router, prefix="/api", tags=["Auth"])
app.include_router(users.router, prefix="/api", tags=["Users"])
app.include_router(models_info.router, prefix="/api", tags=["Models"])

# Phase 3 -- Predictions & History
app.include_router(predict.router, prefix="/api", tags=["Predictions"])
app.include_router(history.router, prefix="/api", tags=["History"])

# Phase 5 -- File Uploads
app.include_router(uploads.router, prefix="/api", tags=["Uploads"])
# app.include_router(export.router, prefix="/api", tags=["Export"])
# app.include_router(admin.router, prefix="/api", tags=["Admin"])
# app.include_router(symptom_check.router, prefix="/api", tags=["Symptom Check"])
