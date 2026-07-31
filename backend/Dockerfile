FROM python:3.11-slim

# System dependencies for WeasyPrint (PDF generation) + Tesseract (OCR)
RUN apt-get update && apt-get install -y --no-install-recommends \
    tesseract-ocr \
    libpango-1.0-0 \
    libpangoft2-1.0-0 \
    libgdk-pixbuf2.0-0 \
    libffi-dev \
    libcairo2 \
    shared-mime-info \
    fonts-liberation \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install dependencies first (leverages Docker layer cache)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application source
COPY app ./app

# models/ directory is mounted at runtime via docker-compose volumes
# The MODELS_DIR env var should point to /app/models when running in Docker

# Run as a non-root user for security
RUN adduser --disabled-password --gecos "" appuser \
 && chown -R appuser:appuser /app
USER appuser

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
