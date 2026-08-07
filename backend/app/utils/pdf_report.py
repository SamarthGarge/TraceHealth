"""
pdf_report.py — ReportLab-based PDF report generator for prediction history.

Professional layout:
  - Cover page with user info, date range, and disclaimer
  - 1 prediction per page (tabular + image predictions)
  - Each page: header bar, ensemble result, 3-model comparison, SHAP features
  - Image predictions: Grad-CAM heatmap + class probabilities on same page
  - Final page: methodology + disclaimer
"""

from io import BytesIO
from datetime import datetime, timezone

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, PageBreak, Image as RLImage, KeepTogether,
)
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT

# ── Brand colours ─────────────────────────────────────────────────────────────

TERRA        = colors.HexColor("#8B4513")
TERRA_LIGHT  = colors.HexColor("#D4A574")
PARCHMENT    = colors.HexColor("#F5F0E8")
PARCHMENT_LO = colors.HexColor("#EDE7DB")
INK          = colors.HexColor("#1A1A1A")
INK_LIGHT    = colors.HexColor("#555555")
INK_GHOST    = colors.HexColor("#999999")
BORDER       = colors.HexColor("#E0D8CC")
STATUS_HIGH  = colors.HexColor("#C0392B")
STATUS_MED   = colors.HexColor("#E67E22")
STATUS_LOW   = colors.HexColor("#27AE60")
WHITE        = colors.white

DISEASE_LABEL = {
    "diabetes": "Diabetes",
    "heart":    "Heart Disease",
    "tb":       "Tuberculosis",
    "cancer":   "Lung Cancer",
}

RISK_COLOR = {
    "High":     STATUS_HIGH,
    "Moderate": STATUS_MED,
    "Low":      STATUS_LOW,
}

MODEL_LABEL = {
    "lr":  "Logistic Regression",
    "rf":  "Random Forest",
    "xgb": "XGBoost",
}

PAGE_W, PAGE_H = A4
MARGIN = 18 * mm
USABLE_W = PAGE_W - 2 * MARGIN


# ── Styles ────────────────────────────────────────────────────────────────────

def _s():
    """Build all paragraph styles."""
    return {
        "cover_title": ParagraphStyle(
            "CoverTitle", fontName="Helvetica-Bold", fontSize=26,
            textColor=TERRA, spaceAfter=2 * mm,
        ),
        "cover_sub": ParagraphStyle(
            "CoverSub", fontName="Helvetica", fontSize=12,
            textColor=INK_LIGHT, spaceAfter=8 * mm,
        ),
        "section": ParagraphStyle(
            "Section", fontName="Helvetica-Bold", fontSize=12,
            textColor=TERRA, spaceBefore=0, spaceAfter=3 * mm,
        ),
        "subsection": ParagraphStyle(
            "Subsection", fontName="Helvetica-Bold", fontSize=9,
            textColor=INK, spaceBefore=4 * mm, spaceAfter=2 * mm,
        ),
        "body": ParagraphStyle(
            "Body", fontName="Helvetica", fontSize=8.5,
            textColor=INK_LIGHT, leading=13, spaceAfter=2 * mm,
        ),
        "body_small": ParagraphStyle(
            "BodySmall", fontName="Helvetica", fontSize=7.5,
            textColor=INK_GHOST, leading=11,
        ),
        "disclaimer": ParagraphStyle(
            "Disclaimer", fontName="Helvetica-Oblique", fontSize=7,
            textColor=INK_GHOST, leading=10,
        ),
        "page_header": ParagraphStyle(
            "PageHeader", fontName="Helvetica-Bold", fontSize=14,
            textColor=INK, spaceAfter=1 * mm,
        ),
        "page_date": ParagraphStyle(
            "PageDate", fontName="Helvetica", fontSize=8,
            textColor=INK_GHOST, spaceAfter=4 * mm,
        ),
        "risk_high": ParagraphStyle(
            "RiskHigh", fontName="Helvetica-Bold", fontSize=11,
            textColor=STATUS_HIGH, alignment=TA_CENTER,
        ),
        "risk_mod": ParagraphStyle(
            "RiskMod", fontName="Helvetica-Bold", fontSize=11,
            textColor=STATUS_MED, alignment=TA_CENTER,
        ),
        "risk_low": ParagraphStyle(
            "RiskLow", fontName="Helvetica-Bold", fontSize=11,
            textColor=STATUS_LOW, alignment=TA_CENTER,
        ),
        "meta_label": ParagraphStyle(
            "MetaLabel", fontName="Helvetica-Bold", fontSize=8,
            textColor=INK, leading=12,
        ),
        "meta_value": ParagraphStyle(
            "MetaValue", fontName="Helvetica", fontSize=8.5,
            textColor=INK_LIGHT, leading=12,
        ),
    }


# ── Helpers ───────────────────────────────────────────────────────────────────

def _pct(val):
    if val is None:
        return "\u2014"
    return f"{val * 100:.1f}%"


def _fmt_date(val):
    if val is None:
        return "\u2014"
    if isinstance(val, datetime):
        return val.strftime("%d %b %Y, %H:%M")
    try:
        dt = datetime.fromisoformat(str(val).replace("Z", "+00:00"))
        return dt.strftime("%d %b %Y, %H:%M")
    except Exception:
        return str(val)


def _fmt_date_short(val):
    if val is None:
        return "\u2014"
    if isinstance(val, datetime):
        return val.strftime("%d %b %Y")
    try:
        dt = datetime.fromisoformat(str(val).replace("Z", "+00:00"))
        return dt.strftime("%d %b %Y")
    except Exception:
        return str(val)


def _compact_table_style():
    """Shared compact table style for prediction detail tables."""
    return TableStyle([
        ("BACKGROUND",    (0, 0), (-1, 0), PARCHMENT),
        ("TEXTCOLOR",     (0, 0), (-1, 0), INK),
        ("FONTNAME",      (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE",      (0, 0), (-1, 0), 7.5),
        ("BOTTOMPADDING", (0, 0), (-1, 0), 3),
        ("TOPPADDING",    (0, 0), (-1, 0), 3),
        ("LINEBELOW",     (0, 0), (-1, 0), 0.5, BORDER),
        ("FONTNAME",      (0, 1), (-1, -1), "Helvetica"),
        ("FONTSIZE",      (0, 1), (-1, -1), 7.5),
        ("ROWBACKGROUNDS",(0, 1), (-1, -1), [WHITE, PARCHMENT_LO]),
        ("BOTTOMPADDING", (0, 1), (-1, -1), 2.5),
        ("TOPPADDING",    (0, 1), (-1, -1), 2.5),
        ("LINEBELOW",     (0, 0), (-1, -1), 0.2, BORDER),
        ("LEFTPADDING",   (0, 0), (-1, -1), 5),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 5),
        ("VALIGN",        (0, 0), (-1, -1), "MIDDLE"),
    ])


# ── Page-level builders ──────────────────────────────────────────────────────

def _build_cover(story, S, user_name, user_email, predictions, disease_filter,
                 date_from, date_to):
    """Build the cover page."""
    story.append(Spacer(1, 25 * mm))
    story.append(Paragraph("TraceHealth", S["cover_title"]))
    story.append(Paragraph("Prediction Report", S["cover_sub"]))
    story.append(HRFlowable(width=USABLE_W, thickness=0.6, color=TERRA_LIGHT,
                            spaceAfter=8 * mm))

    # Meta info table
    meta = []
    if user_name:
        meta.append([Paragraph("Patient", S["meta_label"]),
                     Paragraph(user_name, S["meta_value"])])
    if user_email:
        meta.append([Paragraph("Email", S["meta_label"]),
                     Paragraph(user_email, S["meta_value"])])
    meta.append([Paragraph("Generated", S["meta_label"]),
                 Paragraph(_fmt_date(datetime.now(timezone.utc)), S["meta_value"])])

    # Date range
    if date_from or date_to:
        range_str = f"{_fmt_date_short(date_from)}  \u2013  {_fmt_date_short(date_to)}"
        meta.append([Paragraph("Date Range", S["meta_label"]),
                     Paragraph(range_str, S["meta_value"])])

    meta.append([Paragraph("Predictions", S["meta_label"]),
                 Paragraph(str(len(predictions)), S["meta_value"])])

    if disease_filter:
        meta.append([Paragraph("Disease Filter", S["meta_label"]),
                     Paragraph(DISEASE_LABEL.get(disease_filter, disease_filter),
                               S["meta_value"])])

    # Count by type
    tabular_count = sum(1 for p in predictions if p.get("input_type") != "image")
    image_count = sum(1 for p in predictions if p.get("input_type") == "image")
    if tabular_count:
        meta.append([Paragraph("Clinical Data", S["meta_label"]),
                     Paragraph(f"{tabular_count} prediction{'s' if tabular_count != 1 else ''}",
                               S["meta_value"])])
    if image_count:
        meta.append([Paragraph("Image Analysis", S["meta_label"]),
                     Paragraph(f"{image_count} prediction{'s' if image_count != 1 else ''}",
                               S["meta_value"])])

    if meta:
        t = Table(meta, colWidths=[35 * mm, USABLE_W - 35 * mm])
        t.setStyle(TableStyle([
            ("TOPPADDING",    (0, 0), (-1, -1), 3),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
            ("LINEBELOW",     (0, 0), (-1, -1), 0.15, BORDER),
        ]))
        story.append(t)

    story.append(Spacer(1, 10 * mm))

    # Risk distribution summary
    risk_counts = {"High": 0, "Moderate": 0, "Low": 0}
    for p in predictions:
        r = p.get("ensemble_risk_level", "")
        if r in risk_counts:
            risk_counts[r] += 1

    if any(risk_counts.values()):
        story.append(Paragraph("Risk Distribution", S["subsection"]))
        dist_rows = [["Risk Level", "Count"]]
        for level in ("High", "Moderate", "Low"):
            dist_rows.append([level, str(risk_counts[level])])
        dt_table = Table(dist_rows, colWidths=[50 * mm, 30 * mm])
        style = _compact_table_style()
        # Color the risk text
        for i, level in enumerate(("High", "Moderate", "Low"), start=1):
            c = RISK_COLOR.get(level, INK_LIGHT)
            style.add("TEXTCOLOR", (0, i), (0, i), c)
            style.add("FONTNAME", (0, i), (0, i), "Helvetica-Bold")
        dt_table.setStyle(style)
        story.append(dt_table)

    story.append(Spacer(1, 10 * mm))
    story.append(Paragraph(
        "\u26A0 This report is for educational purposes only and does not constitute "
        "medical advice or a clinical diagnosis. Consult a qualified healthcare "
        "professional before making any health decisions.",
        S["disclaimer"],
    ))


def _build_tabular_page(story, S, pred):
    """Build a single page for a tabular (clinical data) prediction."""
    disease = pred.get("disease", "unknown")
    label = DISEASE_LABEL.get(disease, disease.title())
    risk = pred.get("ensemble_risk_level", "\u2014")
    prob = pred.get("ensemble_probability")
    created = pred.get("created_at")
    models = {m.get("model_key"): m for m in (pred.get("models") or [])}

    # ── Header ────────────────────────────────────────────────────────────
    story.append(PageBreak())

    # Top bar: disease + date
    header_data = [[
        Paragraph(f"{label} \u2014 Risk Screening", S["page_header"]),
        Paragraph(_fmt_date(created), ParagraphStyle(
            "DateR", fontName="Helvetica", fontSize=8,
            textColor=INK_GHOST, alignment=TA_RIGHT)),
    ]]
    ht = Table(header_data, colWidths=[USABLE_W * 0.65, USABLE_W * 0.35])
    ht.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "BOTTOM"),
        ("TOPPADDING", (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
    ]))
    story.append(ht)
    story.append(HRFlowable(width=USABLE_W, thickness=0.4, color=TERRA_LIGHT,
                            spaceAfter=5 * mm))

    # ── Ensemble Result ───────────────────────────────────────────────────
    risk_style = S.get(f"risk_{risk.lower()}", S["risk_mod"]) if risk != "\u2014" else S["risk_mod"]
    risk_color = RISK_COLOR.get(risk, INK_LIGHT)

    result_data = [[
        Paragraph("ENSEMBLE RESULT", ParagraphStyle(
            "EnsLabel", fontName="Helvetica-Bold", fontSize=7,
            textColor=INK_GHOST, alignment=TA_CENTER)),
    ], [
        Paragraph(f"{risk} Risk \u2014 {_pct(prob)}", risk_style),
    ]]
    result_table = Table(result_data, colWidths=[USABLE_W])
    result_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), PARCHMENT_LO),
        ("TOPPADDING", (0, 0), (-1, 0), 4),
        ("BOTTOMPADDING", (0, -1), (-1, -1), 5),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("ROUNDEDCORNERS", [3, 3, 3, 3]),
    ]))
    story.append(result_table)
    story.append(Spacer(1, 4 * mm))

    # ── 3-Model Comparison ────────────────────────────────────────────────
    story.append(Paragraph("Model Comparison", S["subsection"]))
    model_rows = [["Model", "Probability", "Risk Level"]]
    for mk in ("lr", "rf", "xgb"):
        m = models.get(mk, {})
        model_rows.append([
            MODEL_LABEL.get(mk, mk.upper()),
            _pct(m.get("probability")),
            m.get("risk_level", "\u2014"),
        ])
    mt = Table(model_rows, colWidths=[60 * mm, 45 * mm, 45 * mm])
    style = _compact_table_style()
    # Color the risk column
    for i, mk in enumerate(("lr", "rf", "xgb"), start=1):
        m = models.get(mk, {})
        c = RISK_COLOR.get(m.get("risk_level", ""), INK_LIGHT)
        style.add("TEXTCOLOR", (2, i), (2, i), c)
        style.add("FONTNAME", (2, i), (2, i), "Helvetica-Bold")
    mt.setStyle(style)
    story.append(mt)
    story.append(Spacer(1, 3 * mm))

    # ── Input Features (compact) ──────────────────────────────────────────
    features = pred.get("features") or {}
    if features:
        story.append(Paragraph("Input Features", S["subsection"]))
        feat_items = list(features.items())
        # 3-column layout for compactness
        cols = 3
        feat_rows = [["Feature", "Value"] * cols]
        for i in range(0, len(feat_items), cols):
            row = []
            for j in range(cols):
                idx = i + j
                if idx < len(feat_items):
                    k, v = feat_items[idx]
                    row.extend([k, str(v)])
                else:
                    row.extend(["", ""])
            feat_rows.append(row)

        col_w = USABLE_W / (cols * 2)
        ft = Table(feat_rows, colWidths=[col_w] * (cols * 2))
        ft.setStyle(TableStyle([
            ("BACKGROUND",    (0, 0), (-1, 0), PARCHMENT),
            ("FONTNAME",      (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE",      (0, 0), (-1, -1), 6.5),
            ("TEXTCOLOR",     (0, 0), (-1, 0), INK),
            ("TEXTCOLOR",     (0, 1), (-1, -1), INK_LIGHT),
            ("TOPPADDING",    (0, 0), (-1, -1), 2),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
            ("LEFTPADDING",   (0, 0), (-1, -1), 3),
            ("RIGHTPADDING",  (0, 0), (-1, -1), 3),
            ("LINEBELOW",     (0, 0), (-1, 0), 0.3, BORDER),
            ("LINEBELOW",     (0, 0), (-1, -1), 0.1, BORDER),
            ("ROWBACKGROUNDS",(0, 1), (-1, -1), [WHITE, PARCHMENT_LO]),
        ]))
        story.append(ft)
        story.append(Spacer(1, 3 * mm))

    # ── SHAP Features ─────────────────────────────────────────────────────
    shap_added = False
    for mk in ("rf", "xgb", "lr"):
        m = models.get(mk, {})
        shap_features = m.get("shap_top_features") or []
        if shap_features:
            story.append(Paragraph(
                f"Key Contributing Factors (SHAP \u2014 {MODEL_LABEL.get(mk, mk.upper())})",
                S["subsection"],
            ))
            shap_rows = [["Feature", "SHAP Value", "Direction"]]
            for sf in shap_features[:5]:
                val = sf.get("value", 0)
                direction = "\u2191 Increases risk" if val > 0 else "\u2193 Decreases risk"
                shap_rows.append([
                    sf.get("feature", ""),
                    f"{val:+.4f}",
                    direction,
                ])
            st = Table(shap_rows, colWidths=[55 * mm, 35 * mm, 55 * mm])
            style = _compact_table_style()
            # Color positive/negative
            for i, sf in enumerate(shap_features[:5], start=1):
                c = STATUS_HIGH if sf.get("value", 0) > 0 else STATUS_LOW
                style.add("TEXTCOLOR", (1, i), (2, i), c)
            st.setStyle(style)
            story.append(st)
            shap_added = True
            break  # show for first model that has SHAP data

    # ── Page footer disclaimer ────────────────────────────────────────────
    story.append(Spacer(1, 5 * mm))
    story.append(HRFlowable(width=USABLE_W, thickness=0.2, color=BORDER,
                            spaceAfter=2 * mm))
    story.append(Paragraph(
        "This screening result is for educational purposes only. "
        "It is not a medical diagnosis. Consult a healthcare professional.",
        S["disclaimer"],
    ))


def _build_image_page(story, S, ip):
    """Build a single page for an image-based prediction."""
    disease = ip.get("disease", "unknown")
    label_disease = DISEASE_LABEL.get(disease, disease.title())
    risk = ip.get("risk_level", "\u2014")
    conf = ip.get("confidence")
    pred_label = ip.get("prediction_label", "")
    created = ip.get("created_at")

    # ── Header ────────────────────────────────────────────────────────────
    story.append(PageBreak())

    header_data = [[
        Paragraph(f"{label_disease} \u2014 Image Analysis", S["page_header"]),
        Paragraph(_fmt_date(created), ParagraphStyle(
            "DateR2", fontName="Helvetica", fontSize=8,
            textColor=INK_GHOST, alignment=TA_RIGHT)),
    ]]
    ht = Table(header_data, colWidths=[USABLE_W * 0.65, USABLE_W * 0.35])
    ht.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "BOTTOM"),
        ("TOPPADDING", (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
    ]))
    story.append(ht)
    story.append(HRFlowable(width=USABLE_W, thickness=0.4, color=TERRA_LIGHT,
                            spaceAfter=5 * mm))

    # ── Ensemble Result ───────────────────────────────────────────────────
    risk_style_key = f"risk_{risk.lower()}" if risk != "\u2014" else "risk_mod"
    risk_style = S.get(risk_style_key, S["risk_mod"])

    result_data = [[
        Paragraph("IMAGE PREDICTION RESULT", ParagraphStyle(
            "ImgLabel", fontName="Helvetica-Bold", fontSize=7,
            textColor=INK_GHOST, alignment=TA_CENTER)),
    ], [
        Paragraph(f"{pred_label} \u2014 {risk} Risk \u2014 {_pct(conf)}", risk_style),
    ]]
    result_table = Table(result_data, colWidths=[USABLE_W])
    result_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), PARCHMENT_LO),
        ("TOPPADDING", (0, 0), (-1, 0), 4),
        ("BOTTOMPADDING", (0, -1), (-1, -1), 5),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("ROUNDEDCORNERS", [3, 3, 3, 3]),
    ]))
    story.append(result_table)
    story.append(Spacer(1, 4 * mm))

    # ── Class Probabilities ───────────────────────────────────────────────
    all_classes = ip.get("all_classes", [])
    if all_classes:
        story.append(Paragraph("Class Probabilities", S["subsection"]))
        prob_rows = [["Class", "Probability"]]
        for c in all_classes:
            prob_rows.append([c.get("label", ""), _pct(c.get("prob"))])
        pt = Table(prob_rows, colWidths=[80 * mm, 50 * mm])
        pt.setStyle(_compact_table_style())
        story.append(pt)
        story.append(Spacer(1, 4 * mm))

    # ── Grad-CAM Heatmap ──────────────────────────────────────────────────
    gradcam_bytes = ip.get("gradcam_bytes")
    if gradcam_bytes:
        try:
            img_buf = BytesIO(gradcam_bytes)
            # Scale image to fit while maintaining quality
            rl_img = RLImage(img_buf, width=100 * mm, height=75 * mm,
                             kind="proportional")
            rl_img.hAlign = "CENTER"

            story.append(Paragraph("Grad-CAM Heatmap", S["subsection"]))
            story.append(rl_img)
            story.append(Spacer(1, 2 * mm))
            story.append(Paragraph(
                "Warm/red regions had the highest influence on the model\u2019s prediction. "
                "Cool/blue regions had minimal influence.",
                S["body_small"],
            ))
        except Exception:
            pass

    # ── Page footer ───────────────────────────────────────────────────────
    story.append(Spacer(1, 5 * mm))
    story.append(HRFlowable(width=USABLE_W, thickness=0.2, color=BORDER,
                            spaceAfter=2 * mm))
    story.append(Paragraph(
        "This image analysis is AI-assisted and for educational purposes only. "
        "It is not a radiological diagnosis. Consult a medical professional.",
        S["disclaimer"],
    ))


def _build_methodology(story, S):
    """Build the final methodology page."""
    story.append(PageBreak())

    story.append(Paragraph("Methodology", S["section"]))
    story.append(HRFlowable(width=USABLE_W, thickness=0.3, color=TERRA_LIGHT,
                            spaceAfter=5 * mm))

    story.append(Paragraph("Clinical Data Models", S["subsection"]))
    story.append(Paragraph(
        "Three machine learning algorithms are trained independently per disease: "
        "Logistic Regression (LR), Random Forest (RF), and XGBoost (XGB). "
        "Models are evaluated using 5-fold stratified cross-validation. "
        "The ensemble probability is the arithmetic mean of all three models. "
        "Risk levels are assigned based on probability thresholds: "
        "Low (\u226440%), Moderate (40\u201365%), High (>65%).",
        S["body"],
    ))

    story.append(Paragraph("SHAP Explanations", S["subsection"]))
    story.append(Paragraph(
        "SHapley Additive exPlanations (SHAP) values indicate each feature\u2019s "
        "contribution to the prediction. Positive values increase risk; negative "
        "values decrease risk. TreeExplainer is used for RF and XGB; "
        "LinearExplainer for LR.",
        S["body"],
    ))

    story.append(Paragraph("Image-Based Models", S["subsection"]))
    story.append(Paragraph(
        "Image predictions use fine-tuned convolutional neural networks (CNNs) "
        "trained on medical imaging datasets. Grad-CAM (Gradient-weighted Class "
        "Activation Mapping) visualises which image regions most influenced the "
        "model\u2019s prediction. Warm/red areas carry the highest influence.",
        S["body"],
    ))

    story.append(Paragraph("Datasets", S["subsection"]))
    story.append(Paragraph(
        "Diabetes: PIMA Indians Diabetes Dataset. "
        "Heart Disease: Cleveland Heart Disease Dataset. "
        "Tuberculosis: WHO TB data with chest X-ray imaging. "
        "Lung Cancer: Lung Cancer Survey dataset with CT scan imaging.",
        S["body"],
    ))

    story.append(Spacer(1, 8 * mm))
    story.append(HRFlowable(width=USABLE_W, thickness=0.2, color=BORDER,
                            spaceAfter=3 * mm))
    story.append(Paragraph(
        "This report was generated automatically by TraceHealth. "
        "All models are for educational screening only and are not validated "
        "medical devices. Do not use this report as a substitute for "
        "professional medical advice, diagnosis, or treatment.",
        S["disclaimer"],
    ))
    story.append(Spacer(1, 3 * mm))
    story.append(Paragraph(
        f"Report generated on {_fmt_date(datetime.now(timezone.utc))} UTC",
        S["body_small"],
    ))


# ── Main PDF builder ─────────────────────────────────────────────────────────

def build_prediction_report(
    predictions: list[dict],
    user_name: str = "",
    user_email: str = "",
    disease_filter: str | None = None,
    image_predictions: list[dict] | None = None,
    date_from: datetime | None = None,
    date_to: datetime | None = None,
) -> bytes:
    """
    Build a professional PDF report with 1 prediction per page.

    Args:
        predictions:       List of tabular prediction dicts from MongoDB.
        user_name:         Display name for the cover page.
        user_email:        Email for the cover page.
        disease_filter:    If set, shown on cover page.
        image_predictions: List of image prediction dicts with gradcam_bytes.
        date_from:         Start of date range filter.
        date_to:           End of date range filter.

    Returns:
        PDF as bytes.
    """
    buf = BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=A4,
        leftMargin=MARGIN,
        rightMargin=MARGIN,
        topMargin=15 * mm,
        bottomMargin=15 * mm,
    )
    S = _s()
    story = []

    # ── Cover page ────────────────────────────────────────────────────────
    _build_cover(story, S, user_name, user_email, predictions, disease_filter,
                 date_from, date_to)

    # Check if there are any predictions at all
    has_tabular = any(p.get("input_type") != "image" for p in predictions)
    has_image = bool(image_predictions)

    if not predictions and not image_predictions:
        story.append(Spacer(1, 15 * mm))
        story.append(Paragraph(
            "No predictions found for the selected date range and filters.",
            S["body"],
        ))
        _build_methodology(story, S)
        doc.build(story)
        return buf.getvalue()

    # ── Tabular prediction pages (1 per prediction) ───────────────────────
    tabular_preds = [p for p in predictions if p.get("input_type") != "image"]
    for pred in sorted(tabular_preds,
                       key=lambda x: x.get("created_at") or "", reverse=True):
        _build_tabular_page(story, S, pred)

    # ── Image prediction pages (1 per prediction) ─────────────────────────
    if image_predictions:
        for ip in sorted(image_predictions,
                         key=lambda x: x.get("created_at") or "", reverse=True):
            _build_image_page(story, S, ip)

    # ── Methodology (final page) ──────────────────────────────────────────
    _build_methodology(story, S)

    doc.build(story)
    return buf.getvalue()
