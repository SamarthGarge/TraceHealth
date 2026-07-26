"""
predict_image.py — Image-based prediction router.

Endpoints:
  POST /api/predict/tb/image     — TB screening from chest X-ray
  POST /api/predict/cancer/image — Lung cancer screening from CT or histopathology

Security:
  - Magic-byte validation: only JPEG/PNG accepted
  - EXIF metadata stripped before storage (privacy — X-rays may carry device/location data)
  - File size cap: 10 MB
  - Optional auth: prediction is always run, only saved if user is authenticated + consented

Response:
  {
    "disease": "tb",
    "input_type": "image",
    "prediction_label": "Tuberculosis",
    "confidence": 0.84,
    "risk_level": "High",
    "gradcam_url": "/api/predict/image/gradcam/{gridfs_id}",
    "all_classes": [{"label": "Normal", "prob": 0.16}, {"label": "Tuberculosis", "prob": 0.84}],
    "saved_to_history": true,
    "prediction_id": "..."
  }
"""

import io
from datetime import datetime, timezone

from bson import ObjectId
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from fastapi.responses import StreamingResponse

from app.db import get_db
from app.ml.gradcam import generate_gradcam
from app.ml.vision_loader import (
    get_cancer_ct_model,
    get_tb_model,
    preprocess_image,
    run_inference,
)
from app.security.dependencies import get_current_user, user_has_consented
from app.utils.logging import get_logger

logger = get_logger(__name__)
router = APIRouter()

# Class labels (no torch dependency)
TB_CLASSES        = ["Normal", "Tuberculosis"]
CANCER_CT_CLASSES = ["Benign", "Malignant", "Normal"]

# ── Constants ─────────────────────────────────────────────────────────────────

MAX_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB

MAGIC_BYTES = {
    b"\xff\xd8\xff": "image/jpeg",
    b"\x89PNG":      "image/png",
}

RISK_THRESHOLDS = {
    "tb": {
        # Binary: index 0=Normal, index 1=TB
        "High":     0.70,
        "Moderate": 0.40,
    },
    "cancer": {
        # Multi-class: Malignant is index 1
        "High":     0.60,
        "Moderate": 0.30,
    },
}


def _validate_image(data: bytes) -> None:
    if len(data) > MAX_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Image too large. Maximum size is 10 MB.",
        )
    for magic, mime in MAGIC_BYTES.items():
        if data[:len(magic)] == magic:
            return
    raise HTTPException(
        status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
        detail="Only JPEG and PNG images are accepted.",
    )


def _strip_exif(image_bytes: bytes) -> bytes:
    """Remove EXIF metadata to protect patient privacy."""
    from PIL import Image
    img = Image.open(io.BytesIO(image_bytes))
    clean_buf = io.BytesIO()
    # Save without EXIF by omitting the exif parameter
    img.save(clean_buf, format="PNG")
    return clean_buf.getvalue()


def _tb_risk(prob_tb: float) -> str:
    t = RISK_THRESHOLDS["tb"]
    if prob_tb >= t["High"]:     return "High"
    if prob_tb >= t["Moderate"]: return "Moderate"
    return "Low"


def _cancer_risk(prob_malignant: float) -> str:
    t = RISK_THRESHOLDS["cancer"]
    if prob_malignant >= t["High"]:     return "High"
    if prob_malignant >= t["Moderate"]: return "Moderate"
    return "Low"


async def _store_gradcam(db, gradcam_bytes: bytes, disease: str) -> str:
    """Store Grad-CAM PNG in GridFS and return the file id as string."""
    import gridfs
    from motor.motor_asyncio import AsyncIOMotorGridFSBucket
    fs = AsyncIOMotorGridFSBucket(db, bucket_name="gradcam_overlays")
    file_id = await fs.upload_from_stream(
        f"gradcam_{disease}_{datetime.now(timezone.utc).isoformat()}.png",
        gradcam_bytes,
        metadata={"content_type": "image/png"},
    )
    return str(file_id)


async def _save_prediction(db, user: dict, disease: str, label: str,
                           confidence: float, risk_level: str,
                           all_classes: list, image_clean: bytes,
                           gradcam_id: str) -> str:
    """Persist image prediction to the predictions collection."""
    from motor.motor_asyncio import AsyncIOMotorGridFSBucket
    fs = AsyncIOMotorGridFSBucket(db, bucket_name="prediction_images")
    image_id = await fs.upload_from_stream(
        f"input_{disease}_{datetime.now(timezone.utc).isoformat()}.png",
        image_clean,
        metadata={"content_type": "image/png"},
    )

    doc = {
        "user_id":      user["sub"],
        "disease":      disease,
        "input_type":   "image",
        "image_ref":    str(image_id),
        "gradcam_ref":  gradcam_id,
        "prediction_label": label,
        "ensemble_probability": confidence,
        "ensemble_risk_level":  risk_level,
        "all_classes":  all_classes,
        "created_at":   datetime.now(timezone.utc),
    }
    result = await db.predictions.insert_one(doc)
    return str(result.inserted_id)


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/predict/tb/image")
async def predict_tb_image(
    image: UploadFile = File(..., description="Chest X-ray (JPEG or PNG, max 10 MB)"),
    current_user: dict | None = Depends(get_current_user),
):
    """
    TB screening from a chest X-ray image.
    Returns binary classification (Normal / Tuberculosis) with Grad-CAM overlay.
    """

    data = await image.read()
    _validate_image(data)
    image_clean = _strip_exif(data)

    try:
        model = get_tb_model()
    except FileNotFoundError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except OSError as e:
        raise HTTPException(
            status_code=503,
            detail=(
                "PyTorch vision model unavailable on this system "
                "(DLL load error — likely missing Visual C++ redistributable or CUDA runtime). "
                f"Detail: {e}"
            ),
        )

    tensor = preprocess_image(image_clean)
    pred_idx, probs = run_inference(model, tensor)

    label      = TB_CLASSES[pred_idx]
    confidence = probs[pred_idx]
    prob_tb    = probs[1]
    risk_level = _tb_risk(prob_tb)

    all_classes = [
        {"label": TB_CLASSES[i], "prob": round(p, 4)}
        for i, p in enumerate(probs)
    ]

    db = get_db()
    gradcam_bytes = generate_gradcam(model, tensor, pred_idx, image_clean)
    gradcam_id    = await _store_gradcam(db, gradcam_bytes, "tb")

    saved   = False
    pred_id = None
    if current_user and user_has_consented(current_user):
        pred_id = await _save_prediction(
            db, current_user, "tb", label, confidence, risk_level,
            all_classes, image_clean, gradcam_id,
        )
        saved = True

    return {
        "disease":          "tb",
        "input_type":       "image",
        "prediction_label": label,
        "confidence":       round(confidence, 4),
        "risk_level":       risk_level,
        "gradcam_url":      f"/api/predict/image/gradcam/{gradcam_id}",
        "all_classes":      all_classes,
        "saved_to_history": saved,
        "prediction_id":    pred_id,
    }


@router.post("/predict/cancer/image")
async def predict_cancer_image(
    image: UploadFile = File(..., description="CT scan or histopathology image (JPEG/PNG, max 10 MB)"),
    current_user: dict | None = Depends(get_current_user),
):
    """
    Lung cancer screening from a CT scan image.
    Returns 3-class classification (Benign / Malignant / Normal) with Grad-CAM overlay.
    """

    data = await image.read()
    _validate_image(data)
    image_clean = _strip_exif(data)

    try:
        model = get_cancer_ct_model()
    except FileNotFoundError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except OSError as e:
        raise HTTPException(
            status_code=503,
            detail=(
                "PyTorch vision model unavailable on this system "
                "(DLL load error — likely missing Visual C++ redistributable or CUDA runtime). "
                f"Detail: {e}"
            ),
        )

    tensor = preprocess_image(image_clean)
    pred_idx, probs = run_inference(model, tensor)

    label           = CANCER_CT_CLASSES[pred_idx]
    confidence      = probs[pred_idx]
    prob_malignant  = probs[1]  # index 1 = Malignant
    risk_level      = _cancer_risk(prob_malignant)

    all_classes = [
        {"label": CANCER_CT_CLASSES[i], "prob": round(p, 4)}
        for i, p in enumerate(probs)
    ]

    db = get_db()
    gradcam_bytes = generate_gradcam(model, tensor, pred_idx, image_clean)
    gradcam_id    = await _store_gradcam(db, gradcam_bytes, "cancer")

    saved   = False
    pred_id = None
    if current_user and user_has_consented(current_user):
        pred_id = await _save_prediction(
            db, current_user, "cancer", label, confidence, risk_level,
            all_classes, image_clean, gradcam_id,
        )
        saved = True

    return {
        "disease":        "cancer",
        "input_type":     "image",
        "prediction_label": label,
        "confidence":     round(confidence, 4),
        "risk_level":     risk_level,
        "gradcam_url":    f"/api/predict/image/gradcam/{gradcam_id}",
        "all_classes":    all_classes,
        "saved_to_history": saved,
        "prediction_id":    pred_id,
    }


@router.get("/predict/image/gradcam/{gradcam_id}")
async def serve_gradcam(gradcam_id: str):
    """Serve a stored Grad-CAM overlay PNG from GridFS."""
    db = get_db()
    from motor.motor_asyncio import AsyncIOMotorGridFSBucket
    fs = AsyncIOMotorGridFSBucket(db, bucket_name="gradcam_overlays")
    try:
        grid_out = await fs.open_download_stream(ObjectId(gradcam_id))
        data = await grid_out.read()
    except Exception:
        raise HTTPException(status_code=404, detail="Grad-CAM overlay not found.")

    return StreamingResponse(io.BytesIO(data), media_type="image/png")
