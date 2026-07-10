"""
Rate limiting configuration using slowapi.
Applied to auth routes (tightest) and prediction/upload routes (generous but present).
See docs/Backend.md §4.4 for the full rationale.
"""
from slowapi import Limiter
from slowapi.util import get_remote_address
from fastapi import Request
from fastapi.responses import JSONResponse

limiter = Limiter(key_func=get_remote_address)

# Route-level limit strings — apply via @limiter.limit("X/minute") decorator on router functions
AUTH_LIMIT = "10/minute"          # login, register, refresh — credential attack surface
PREDICT_LIMIT = "30/minute"       # prevent scripted prediction abuse
UPLOAD_LIMIT = "20/minute"        # prevent storage exhaustion
EXPORT_LIMIT = "5/minute"         # PDF generation is expensive per-request
ADMIN_LIMIT = "30/minute"         # admin analytics — tight + fully logged


def rate_limit_handler(request: Request, exc: Exception) -> JSONResponse:
    """Returns a clean JSON 429 instead of the default slowapi HTML response."""
    return JSONResponse(
        status_code=429,
        content={
            "detail": "Too many requests. Please slow down and try again shortly."
        },
    )
