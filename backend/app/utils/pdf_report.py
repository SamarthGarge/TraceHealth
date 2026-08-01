"""
pdf_report.py — ReportLab-based PDF report generator for prediction history.

Generates a multi-section PDF:
  - Cover page (user name, date, disclaimer)
  - Summary stats (total predictions, risk distribution)
  - Per-disease sections with prediction table and SHAP top features
  - Methodology + footer disclaimer
"""

from io import BytesIO
from datetime import datetime, timezone

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, PageBreak, Image as RLImage,
)
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT

# ── Brand colours ─────────────────────────────────────────────────────────────

TERRA        = colors.HexColor("#8B4513")
PARCHMENT    = colors.HexColor("#F5F0E8")
INK          = colors.HexColor("#1A1A1A")
INK_LIGHT    = colors.HexColor("#555555")
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

# ── Styles ────────────────────────────────────────────────────────────────────

def _build_styles():
    base = getSampleStyleSheet()
    styles = {
        "title": ParagraphStyle(
            "Title",
            fontName="Helvetica-Bold",
            fontSize=22,
            textColor=INK,
            spaceAfter=4 * mm,
        ),
        "subtitle": ParagraphStyle(
            "Subtitle",
            fontName="Helvetica",
            fontSize=11,
            textColor=INK_LIGHT,
            spaceAfter=3 * mm,
        ),
        "section": ParagraphStyle(
            "Section",
            fontName="Helvetica-Bold",
            fontSize=13,
            textColor=TERRA,
            spaceBefore=6 * mm,
            spaceAfter=3 * mm,
        ),
        "body": ParagraphStyle(
            "Body",
            fontName="Helvetica",
            fontSize=9,
            textColor=INK_LIGHT,
            leading=14,
            spaceAfter=2 * mm,
        ),
        "mono": ParagraphStyle(
            "Mono",
            fontName="Courier",
            fontSize=8,
            textColor=INK_LIGHT,
            leading=12,
        ),
        "disclaimer": ParagraphStyle(
            "Disclaimer",
            fontName="Helvetica-Oblique",
            fontSize=7.5,
            textColor=INK_LIGHT,
            leading=11,
        ),
        "center": ParagraphStyle(
            "Center",
            fontName="Helvetica",
            fontSize=9,
            textColor=INK_LIGHT,
            alignment=TA_CENTER,
        ),
    }
    return styles


# ── Table helpers ─────────────────────────────────────────────────────────────

_TABLE_HEADER_STYLE = TableStyle([
    ("BACKGROUND",    (0, 0), (-1, 0), PARCHMENT),
    ("TEXTCOLOR",     (0, 0), (-1, 0), INK),
    ("FONTNAME",      (0, 0), (-1, 0), "Helvetica-Bold"),
    ("FONTSIZE",      (0, 0), (-1, 0), 8),
    ("BOTTOMPADDING", (0, 0), (-1, 0), 4),
    ("TOPPADDING",    (0, 0), (-1, 0), 4),
    ("LINEBELOW",     (0, 0), (-1, 0), 0.5, BORDER),
    ("FONTNAME",      (0, 1), (-1, -1), "Helvetica"),
    ("FONTSIZE",      (0, 1), (-1, -1), 8),
    ("ROWBACKGROUNDS",(0, 1), (-1, -1), [WHITE, PARCHMENT]),
    ("BOTTOMPADDING", (0, 1), (-1, -1), 3),
    ("TOPPADDING",    (0, 1), (-1, -1), 3),
    ("LINEBELOW",     (0, 0), (-1, -1), 0.25, BORDER),
    ("LEFTPADDING",   (0, 0), (-1, -1), 6),
    ("RIGHTPADDING",  (0, 0), (-1, -1), 6),
])


def _pct(val):
    if val is None:
        return "—"
    return f"{val * 100:.1f}%"


def _fmt_date(val):
    if val is None:
        return "—"
    if isinstance(val, datetime):
        return val.strftime("%d %b %Y, %H:%M UTC")
    try:
        dt = datetime.fromisoformat(str(val).replace("Z", "+00:00"))
        return dt.strftime("%d %b %Y, %H:%M UTC")
    except Exception:
        return str(val)


# ── Main PDF builder ─────────────────────────────────────────────────────────

def build_prediction_report(
    predictions: list[dict],
    user_name: str = "",
    user_email: str = "",
    disease_filter: str | None = None,
    image_predictions: list[dict] | None = None,
) -> bytes:
    """
    Build a PDF report from a list of prediction documents.

    Args:
        predictions:     List of prediction dicts from MongoDB.
        user_name:       Display name for the cover page.
        user_email:      Email for the cover page.
        disease_filter:  If set, only predictions for this disease are included.

    Returns:
        PDF as bytes.
    """
    buf = BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=A4,
        leftMargin=20 * mm,
        rightMargin=20 * mm,
        topMargin=20 * mm,
        bottomMargin=20 * mm,
    )
    S = _build_styles()
    story = []
    W = A4[0] - 40 * mm  # usable width

    # ── Cover ────────────────────────────────────────────────────────────────
    story.append(Spacer(1, 10 * mm))
    story.append(Paragraph("TraceHealth", S["title"]))
    story.append(Paragraph("Prediction History Report", S["subtitle"]))
    story.append(HRFlowable(width=W, thickness=0.5, color=BORDER, spaceAfter=6 * mm))

    meta_rows = []
    if user_name:  meta_rows.append(["Name",       user_name])
    if user_email: meta_rows.append(["Email",      user_email])
    meta_rows.append(["Generated",  _fmt_date(datetime.now(timezone.utc))])
    meta_rows.append(["Predictions", str(len(predictions))])
    if disease_filter:
        meta_rows.append(["Filter", DISEASE_LABEL.get(disease_filter, disease_filter)])

    if meta_rows:
        t = Table(meta_rows, colWidths=[40 * mm, W - 40 * mm])
        t.setStyle(TableStyle([
            ("FONTNAME",  (0, 0), (0, -1), "Helvetica-Bold"),
            ("FONTNAME",  (1, 0), (1, -1), "Helvetica"),
            ("FONTSIZE",  (0, 0), (-1, -1), 9),
            ("TEXTCOLOR", (0, 0), (0, -1), INK),
            ("TEXTCOLOR", (1, 0), (1, -1), INK_LIGHT),
            ("TOPPADDING", (0, 0), (-1, -1), 2),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
        ]))
        story.append(t)

    story.append(Spacer(1, 6 * mm))
    story.append(Paragraph(
        "⚠ This report is for educational purposes only and does not constitute "
        "medical advice or a clinical diagnosis. Consult a qualified healthcare "
        "professional before making any health decisions.",
        S["disclaimer"],
    ))

    # ── Summary by disease ───────────────────────────────────────────────────
    by_disease: dict[str, list] = {}
    for p in predictions:
        d = p.get("disease", "unknown")
        by_disease.setdefault(d, []).append(p)

    if not predictions:
        story.append(Spacer(1, 10 * mm))
        story.append(Paragraph("No predictions found for this export.", S["body"]))
        doc.build(story)
        return buf.getvalue()

    story.append(PageBreak())

    # ── Per-disease sections ─────────────────────────────────────────────────
    for disease, preds in sorted(by_disease.items()):
        label = DISEASE_LABEL.get(disease, disease.title())
        story.append(Paragraph(label, S["section"]))
        story.append(Paragraph(
            f"{len(preds)} prediction{'s' if len(preds) != 1 else ''} on record.",
            S["body"],
        ))

        # Predictions table
        header = ["Date", "Risk Level", "Ensemble Prob.", "LR", "RF", "XGB"]
        rows = [header]
        for p in sorted(preds, key=lambda x: x.get("created_at") or "", reverse=True):
            models = {m.get("model_key"): m for m in (p.get("models") or [])}
            rows.append([
                _fmt_date(p.get("created_at")),
                p.get("ensemble_risk_level", "—"),
                _pct(p.get("ensemble_probability")),
                _pct(models.get("lr", {}).get("probability")),
                _pct(models.get("rf", {}).get("probability")),
                _pct(models.get("xgb", {}).get("probability")),
            ])

        col_widths = [45*mm, 25*mm, 30*mm, 22*mm, 22*mm, 22*mm]
        t = Table(rows, colWidths=col_widths, repeatRows=1)
        t.setStyle(_TABLE_HEADER_STYLE)

        # Colour-code the risk level column
        for i, p in enumerate(preds, start=1):
            risk = p.get("ensemble_risk_level", "")
            c = RISK_COLOR.get(risk)
            if c:
                t.setStyle(TableStyle([("TEXTCOLOR", (1, i), (1, i), c)]))

        story.append(t)
        story.append(Spacer(1, 4 * mm))

        # SHAP highlights from most recent prediction
        latest = sorted(preds, key=lambda x: x.get("created_at") or "", reverse=True)[0]
        models_data = {m.get("model_key"): m for m in (latest.get("models") or [])}

        shap_added = False
        for mk in ("rf", "xgb", "lr"):
            m = models_data.get(mk, {})
            shap_features = m.get("shap_top_features") or []
            if shap_features:
                story.append(Paragraph(
                    f"Top SHAP Features — {mk.upper()} (most recent prediction)",
                    ParagraphStyle("SHAPHead", fontName="Helvetica-Bold", fontSize=8,
                                   textColor=INK, spaceAfter=2*mm),
                ))
                shap_rows = [["Feature", "SHAP Value"]]
                for sf in shap_features[:6]:
                    shap_rows.append([sf.get("feature", ""), f"{sf.get('value', 0):+.4f}"])
                st = Table(shap_rows, colWidths=[80*mm, 40*mm])
                st.setStyle(_TABLE_HEADER_STYLE)
                story.append(st)
                story.append(Spacer(1, 3*mm))
                shap_added = True
                break  # show SHAP for the first model that has data

        story.append(HRFlowable(width=W, thickness=0.25, color=BORDER, spaceAfter=4*mm))

    # ── Image Analysis Section ────────────────────────────────────────────────
    if image_predictions:
        story.append(PageBreak())
        story.append(Paragraph("Image-Based Analysis", S["section"]))
        story.append(Paragraph(
            "The following results are from AI-assisted screening of medical images "
            "(chest X-rays or CT scans). Grad-CAM heatmaps highlight the regions the model "
            "focused on when making each prediction. Warm/red regions carry the highest influence.",
            S["body"],
        ))
        story.append(Spacer(1, 4 * mm))

        for ip in image_predictions:
            d_label = DISEASE_LABEL.get(ip.get("disease", ""), ip.get("disease", "").title())
            risk    = ip.get("risk_level", "")
            risk_c  = RISK_COLOR.get(risk, INK_LIGHT)
            conf    = ip.get("confidence")
            label   = ip.get("prediction_label", "")
            created = ip.get("created_at")

            # Sub-header: disease + date
            story.append(Paragraph(
                f"{d_label} — {_fmt_date(created)}",
                ParagraphStyle("ImgHead", fontName="Helvetica-Bold", fontSize=10,
                               textColor=TERRA, spaceBefore=4*mm, spaceAfter=2*mm),
            ))

            # Summary table: label | risk | confidence
            summary_rows = [
                ["Detected Class", "Risk Level", "Confidence"],
                [label, risk, _pct(conf)],
            ]
            st = Table(summary_rows, colWidths=[60*mm, 40*mm, 40*mm])
            st.setStyle(TableStyle([
                ("BACKGROUND",    (0, 0), (-1, 0), PARCHMENT),
                ("FONTNAME",      (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE",      (0, 0), (-1, -1), 8),
                ("TEXTCOLOR",     (1, 1), (1, 1), risk_c),
                ("FONTNAME",      (0, 1), (-1, -1), "Helvetica"),
                ("TOPPADDING",    (0, 0), (-1, -1), 3),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
                ("LEFTPADDING",   (0, 0), (-1, -1), 6),
                ("RIGHTPADDING",  (0, 0), (-1, -1), 6),
                ("LINEBELOW",     (0, 0), (-1, 0), 0.5, BORDER),
                ("LINEBELOW",     (0, 0), (-1, -1), 0.25, BORDER),
            ]))
            story.append(st)
            story.append(Spacer(1, 3 * mm))

            # Class probabilities table
            all_classes = ip.get("all_classes", [])
            if all_classes:
                prob_rows = [["Class", "Probability"]]
                for c in all_classes:
                    prob_rows.append([c.get("label", ""), _pct(c.get("prob"))])
                pt = Table(prob_rows, colWidths=[80*mm, 40*mm])
                pt.setStyle(_TABLE_HEADER_STYLE)
                story.append(pt)
                story.append(Spacer(1, 3 * mm))

            # Grad-CAM image
            gradcam_bytes = ip.get("gradcam_bytes")
            if gradcam_bytes:
                try:
                    img_buf = BytesIO(gradcam_bytes)
                    rl_img  = RLImage(img_buf, width=120 * mm, height=90 * mm)
                    rl_img.hAlign = "LEFT"
                    story.append(Paragraph(
                        "Grad-CAM Heatmap",
                        ParagraphStyle("HeatmapLabel", fontName="Helvetica-Bold", fontSize=8,
                                       textColor=INK, spaceAfter=2*mm),
                    ))
                    story.append(rl_img)
                    story.append(Paragraph(
                        "Warm/red regions had the highest influence on the prediction result.",
                        ParagraphStyle("HeatmapNote", fontName="Helvetica-Oblique", fontSize=7,
                                       textColor=INK_LIGHT, spaceBefore=2*mm, spaceAfter=3*mm),
                    ))
                except Exception:
                    pass  # skip if image cannot be rendered

            story.append(HRFlowable(width=W, thickness=0.25, color=BORDER, spaceAfter=4*mm))

    # ── Methodology ──────────────────────────────────────────────────────────
    story.append(Paragraph("Methodology", S["section"]))
    story.append(Paragraph(
        "Models were trained on publicly available datasets (PIMA Diabetes, Cleveland Heart Disease, "
        "WHO TB data, Lung Cancer Survey). Three algorithms — Logistic Regression, Random Forest, "
        "and XGBoost — are evaluated per disease using 5-fold cross-validation. "
        "Ensemble probability is the mean of all three models. "
        "SHAP values are computed using TreeExplainer (RF, XGBoost) and LinearExplainer (LR). "
        "Image-based predictions use a fine-tuned CNN with Grad-CAM visualisation.",
        S["body"],
    ))
    story.append(Spacer(1, 3*mm))
    story.append(Paragraph(
        "This report was generated automatically by TraceHealth. "
        "Do not use it as a substitute for professional medical advice.",
        S["disclaimer"],
    ))

    doc.build(story)
    return buf.getvalue()
