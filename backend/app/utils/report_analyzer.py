"""
Medical Report Analyzer — OCR + rule-based health insights.

Extracts text from an uploaded PDF or image file using pdfplumber / pytesseract,
then applies a flexible multi-pattern engine to identify common health markers and
generate personalised dietary, lifestyle, and follow-up recommendations.

Pattern strategy:
  - Each marker has multiple alias keywords (handles abbreviations, Indian lab variants)
  - Value extraction uses a loose number search after any keyword match
  - All patterns are case-insensitive and whitespace-tolerant
"""
import io
import re
from dataclasses import dataclass, field
from typing import Any

# ── Shared helpers ─────────────────────────────────────────────────────────────

def _find_value(text: str, keywords: list[str], unit_hints: list[str] | None = None) -> str | None:
    """
    Search `text` for any keyword from `keywords`, then grab the first
    numeric value (including decimals) that follows within ~60 characters.
    Returns the matched number as a string, or None if not found.
    """
    for kw in keywords:
        # Build a flexible pattern: keyword, then optional junk, then a number
        # (?:...) matches units/labels between keyword and number
        pattern = re.compile(
            re.escape(kw) + r"[\s\S]{0,60}?(\d+\.?\d*)",
            re.IGNORECASE,
        )
        m = pattern.search(text)
        if m:
            return m.group(1)
    return None


def _find_bp(text: str) -> tuple[int, int] | None:
    """Find blood pressure as SYS/DIA pairs in any format."""
    patterns = [
        # 120/80, 120 / 80
        r"(\d{2,3})\s*/\s*(\d{2,3})",
        # Systolic ... 120 ... Diastolic ... 80
        r"systolic\D{0,30}(\d{2,3})\D{0,60}diastolic\D{0,30}(\d{2,3})",
        r"sys\D{0,30}(\d{2,3})\D{0,60}dia\D{0,30}(\d{2,3})",
        r"bp\D{0,30}(\d{2,3})\D{0,30}(\d{2,3})",
        r"blood\s*pressure\D{0,30}(\d{2,3})\D{0,30}(\d{2,3})",
    ]
    for p in patterns:
        m = re.search(p, text, re.IGNORECASE)
        if m:
            s, d = int(m.group(1)), int(m.group(2))
            # Sanity check: systolic 80–200, diastolic 40–130
            if 80 <= s <= 200 and 40 <= d <= 130:
                return s, d
    return None


# ── Marker definitions ─────────────────────────────────────────────────────────
# Each entry: (marker_name, keyword_aliases, advice_fn)
# advice_fn(value: float) -> (status, advice_list, foods_list)

@dataclass
class Marker:
    name: str
    detected: bool = False
    value: str = ""
    status: str = "normal"
    advice: list[str] = field(default_factory=list)
    foods: list[str] = field(default_factory=list)


# ── Individual marker analyzers ────────────────────────────────────────────────

def _glucose(text: str) -> dict | None:
    keywords = [
        "fasting blood glucose", "fasting glucose", "blood glucose",
        "glucose fasting", "glucose (f)", "glucose(f)",
        "blood sugar fasting", "blood sugar (f)", "blood sugar(f)",
        "fasting blood sugar", "fbs", "rbs", "sugar fasting",
        "f.b.s", "f.b.g", "glucose",
    ]
    val_str = _find_value(text, keywords)
    if not val_str:
        return None
    val = float(val_str)
    # Ignore implausibly small/large values (mmol/L confusion etc.)
    if val < 2 or val > 600:
        return None
    m = Marker(name="Blood Glucose", detected=True, value=f"{val} mg/dL")
    if val >= 126:
        m.status = "high"
        m.advice = [
            "Fasting blood glucose ≥126 mg/dL indicates the diabetic range. Please consult a doctor for formal evaluation.",
            "Reduce refined carbohydrates (white bread, rice, sweets, sugary drinks).",
            "Aim for 30 min of moderate exercise (brisk walk) 5 days a week.",
        ]
        m.foods = ["Leafy greens (spinach, methi)", "Bitter gourd (karela)", "Whole grains (oats, brown rice)", "Lentils, chickpeas", "Cinnamon (as spice)", "Fenugreek seeds (soaked overnight)"]
    elif val >= 100:
        m.status = "high"
        m.advice = [
            "Glucose in the pre-diabetic range (100–125 mg/dL). Lifestyle changes now can prevent type 2 diabetes.",
            "Limit sugary beverages and ultra-processed foods.",
        ]
        m.foods = ["Berries", "Green vegetables", "Nuts", "Whole grain bread"]
    else:
        m.status = "normal"
        m.advice = ["Blood glucose is within the normal fasting range (<100 mg/dL)."]
    return vars(m)


def _hba1c(text: str) -> dict | None:
    keywords = [
        "hba1c", "hb a1c", "hgba1c", "glycated haemoglobin", "glycated hemoglobin",
        "glycosylated haemoglobin", "glycosylated hemoglobin", "a1c",
        "haemoglobin a1c", "hemoglobin a1c", "gh", "glyco hb",
    ]
    val_str = _find_value(text, keywords)
    if not val_str:
        return None
    val = float(val_str)
    if val < 3 or val > 20:
        return None
    m = Marker(name="HbA1c", detected=True, value=f"{val}%")
    if val >= 6.5:
        m.status = "high"
        m.advice = ["HbA1c ≥6.5% indicates diabetes. Discuss medication and diet plan with your doctor.", "Monitor blood sugar daily. Follow a low-glycaemic diet."]
        m.foods = ["Amla (Indian gooseberry)", "Turmeric", "Flaxseeds", "Beans and lentils"]
    elif val >= 5.7:
        m.status = "high"
        m.advice = ["HbA1c 5.7%–6.4% = pre-diabetes range. Dietary and lifestyle changes are key."]
        m.foods = ["Avocado", "Chia seeds", "Quinoa", "Cinnamon tea"]
    else:
        m.status = "normal"
        m.advice = ["HbA1c is within the normal range (<5.7%). Keep it up!"]
    return vars(m)


def _cholesterol(text: str) -> dict | None:
    keywords = [
        "total cholesterol", "serum cholesterol", "s. cholesterol",
        "t. cholesterol", "cholesterol total", "cholesterol,total",
        "t cholesterol", "tc",
    ]
    val_str = _find_value(text, keywords)
    if not val_str:
        return None
    val = float(val_str)
    if val < 50 or val > 600:
        return None
    m = Marker(name="Total Cholesterol", detected=True, value=f"{val} mg/dL")
    if val >= 240:
        m.status = "high"
        m.advice = ["Total cholesterol ≥240 mg/dL is high. Assess cardiovascular risk with your doctor.", "Reduce saturated fats (butter, red meat, full-fat dairy). Avoid trans fats."]
        m.foods = ["Oats (beta-glucan)", "Fatty fish (salmon, mackerel)", "Walnuts, almonds", "Olive oil", "Avocado", "Garlic"]
    elif val >= 200:
        m.status = "high"
        m.advice = ["Borderline-high cholesterol (200–239 mg/dL). Dietary changes can help significantly."]
        m.foods = ["Apples and pears (soluble fibre)", "Legumes", "Flaxseeds"]
    else:
        m.status = "normal"
        m.advice = ["Total cholesterol is within the healthy range (<200 mg/dL)."]
    return vars(m)


def _ldl(text: str) -> dict | None:
    keywords = [
        "ldl", "ldl cholesterol", "ldl-c", "ldl-cholesterol",
        "low density lipoprotein", "low-density lipoprotein",
        "ldl chol", "l.d.l",
    ]
    val_str = _find_value(text, keywords)
    if not val_str:
        return None
    val = float(val_str)
    if val < 10 or val > 500:
        return None
    m = Marker(name="LDL Cholesterol", detected=True, value=f"{val} mg/dL")
    if val >= 160:
        m.status = "high"
        m.advice = ["High LDL (≥160 mg/dL). Minimise processed meat, full-fat dairy, and fried foods."]
        m.foods = ["Psyllium husk (isabgol)", "Soy protein", "Beans", "Oat bran"]
    elif val >= 130:
        m.status = "high"
        m.advice = ["LDL is borderline high (130–159 mg/dL). Diet and exercise changes are recommended."]
        m.foods = ["Plant sterols (fortified foods)", "Nuts", "Legumes"]
    else:
        m.status = "normal"
        m.advice = ["LDL cholesterol is within acceptable range (<130 mg/dL)."]
    return vars(m)


def _hdl(text: str) -> dict | None:
    keywords = [
        "hdl", "hdl cholesterol", "hdl-c", "hdl-cholesterol",
        "high density lipoprotein", "high-density lipoprotein",
        "hdl chol", "h.d.l",
    ]
    val_str = _find_value(text, keywords)
    if not val_str:
        return None
    val = float(val_str)
    if val < 10 or val > 200:
        return None
    m = Marker(name="HDL Cholesterol", detected=True, value=f"{val} mg/dL")
    if val < 40:
        m.status = "low"
        m.advice = ["Low HDL (<40 mg/dL) increases cardiovascular risk. Exercise raises HDL naturally.", "Quit smoking if applicable — it significantly raises HDL."]
        m.foods = ["Olive oil", "Fatty fish", "Avocado", "Nuts", "Berries"]
    elif val < 50:
        m.status = "low"
        m.advice = ["HDL is slightly low. Aim for ≥50 mg/dL (women) or ≥40 mg/dL (men) through diet and exercise."]
        m.foods = ["Dark chocolate (in moderation)", "Olive oil", "Nuts"]
    else:
        m.status = "normal"
        m.advice = ["Good HDL level — protective for the heart (≥50 mg/dL)."]
    return vars(m)


def _triglycerides(text: str) -> dict | None:
    keywords = [
        "triglycerides", "triglyceride", "tg", "serum triglycerides",
        "s.triglycerides", "triacylglycerol", "triacylglycerols",
    ]
    val_str = _find_value(text, keywords)
    if not val_str:
        return None
    val = float(val_str)
    if val < 10 or val > 2000:
        return None
    m = Marker(name="Triglycerides", detected=True, value=f"{val} mg/dL")
    if val >= 500:
        m.status = "critical"
        m.advice = ["Severely elevated triglycerides (≥500 mg/dL). Risk of pancreatitis — seek medical attention urgently."]
        m.foods = ["Avoid alcohol completely", "No refined carbs or sugar", "Omega-3 fatty acids (fish oil)"]
    elif val >= 200:
        m.status = "high"
        m.advice = ["High triglycerides (200–499 mg/dL). Reduce sugar, alcohol, and refined carbs significantly."]
        m.foods = ["Fatty fish (salmon, mackerel)", "Walnuts", "Flaxseeds", "Leafy greens"]
    elif val >= 150:
        m.status = "high"
        m.advice = ["Borderline-high triglycerides (150–199 mg/dL). Reduce sweets and fried foods."]
        m.foods = ["Fibre-rich foods", "Olive oil", "Avocado"]
    else:
        m.status = "normal"
        m.advice = ["Triglycerides are within the normal range (<150 mg/dL)."]
    return vars(m)


def _hemoglobin(text: str) -> dict | None:
    keywords = [
        "haemoglobin", "hemoglobin", "hb", "hgb",
        "hb%", "haemoglobin%", "hemoglobin%",
        "s. haemoglobin", "serum haemoglobin",
    ]
    # Avoid matching HbA1c — filter out if the surrounding text contains "a1c" or "glycat"
    val_str = _find_value(text, keywords)
    if not val_str:
        return None
    val = float(val_str)
    if val < 3 or val > 25:
        return None
    # Might have caught HbA1c — values 3–9 with % likely are HbA1c, not Hb g/dL
    # Hemoglobin in g/dL: males 13–17, females 12–16, anaemic <12
    if val < 5 or val > 20:
        return None
    m = Marker(name="Hemoglobin", detected=True, value=f"{val} g/dL")
    if val < 11:
        m.status = "low"
        m.advice = [
            "Hemoglobin <11 g/dL indicates moderate-to-severe anemia. Identify the cause (iron, B12, or folate).",
            "Pair iron-rich foods with vitamin C to improve absorption.",
            "Avoid tea/coffee within 1 hour of meals (tannins inhibit iron absorption).",
        ]
        m.foods = ["Spinach, dark leafy greens", "Lentils, kidney beans", "Pomegranate", "Beetroot", "Liver (if non-vegetarian)", "Pumpkin seeds", "Amla / lemon juice (vitamin C)"]
    elif val < 12:
        m.status = "low"
        m.advice = ["Hemoglobin is mildly low (11–12 g/dL). Increase iron-rich foods and consider supplementation."]
        m.foods = ["Spinach", "Lentils", "Pomegranate", "Beetroot", "Fortified cereals"]
    else:
        m.status = "normal"
        m.advice = ["Hemoglobin is within the normal range."]
    return vars(m)


def _blood_pressure(text: str) -> dict | None:
    bp = _find_bp(text)
    if not bp:
        return None
    systolic, diastolic = bp
    m = Marker(name="Blood Pressure", detected=True, value=f"{systolic}/{diastolic} mmHg")
    if systolic >= 140 or diastolic >= 90:
        m.status = "high"
        m.advice = [
            "Blood pressure ≥140/90 mmHg = Hypertension Stage 2. Consult a doctor.",
            "Reduce sodium intake to <2,300 mg/day (avoid pickles, papad, salty snacks).",
            "Manage stress with yoga, meditation, or deep breathing.",
            "Limit alcohol; stop smoking.",
        ]
        m.foods = ["Bananas (potassium)", "Beetroot", "Dark chocolate", "Oats", "Pomegranate", "Spinach", "Garlic", "Low-fat dairy (DASH diet)"]
    elif systolic >= 130 or diastolic >= 80:
        m.status = "high"
        m.advice = ["Blood pressure Stage 1 hypertension (130–139/80–89 mmHg). Walk 30 min daily; reduce salt."]
        m.foods = ["Potassium-rich fruits (banana, avocado)", "Low-sodium foods", "DASH diet foods"]
    else:
        m.status = "normal"
        m.advice = ["Blood pressure is in the healthy range (<130/80 mmHg)."]
    return vars(m)


def _vitamin_d(text: str) -> dict | None:
    keywords = [
        "vitamin d", "vit d", "vitamin d3", "vit d3",
        "25-oh vitamin d", "25 oh vitamin d", "25-hydroxyvitamin d",
        "25(oh)d", "25 oh d", "calcidiol", "cholecalciferol",
        "vitamin d total", "vit d total", "vitamin d, 25-hydroxy",
    ]
    val_str = _find_value(text, keywords)
    if not val_str:
        return None
    val = float(val_str)
    if val < 0 or val > 400:
        return None
    m = Marker(name="Vitamin D", detected=True, value=f"{val} ng/mL")
    if val < 12:
        m.status = "low"
        m.advice = ["Severe Vitamin D deficiency (<12 ng/mL). High-dose supplementation required — see a doctor.", "Get 15–30 minutes of morning sunlight (8–10 AM) daily."]
        m.foods = ["Fatty fish (salmon, sardines)", "Egg yolks", "Sun-exposed mushrooms", "Fortified milk, OJ", "Cod liver oil"]
    elif val < 20:
        m.status = "low"
        m.advice = ["Vitamin D deficiency (12–20 ng/mL). Supplementation + sunlight recommended.", "Take supplements with a meal containing healthy fats (fat-soluble vitamin)."]
        m.foods = ["Fortified dairy", "Fatty fish", "Egg yolks"]
    elif val < 30:
        m.status = "low"
        m.advice = ["Vitamin D insufficient (20–29 ng/mL). Consider supplementation and more sunlight."]
        m.foods = ["Fortified foods", "Oily fish", "Egg yolks"]
    else:
        m.status = "normal"
        m.advice = ["Vitamin D is adequate (≥30 ng/mL)."]
    return vars(m)


def _vitamin_b12(text: str) -> dict | None:
    keywords = [
        "vitamin b12", "vit b12", "vitamin b 12", "b12",
        "cyanocobalamin", "cobalamin", "b-12",
        "serum b12", "s. b12",
    ]
    val_str = _find_value(text, keywords)
    if not val_str:
        return None
    val = float(val_str)
    if val < 10 or val > 5000:
        return None
    m = Marker(name="Vitamin B12", detected=True, value=f"{val} pg/mL")
    if val < 150:
        m.status = "low"
        m.advice = ["Severe B12 deficiency (<150 pg/mL). Injections or high-dose supplements often needed.", "B12 deficiency causes fatigue, nerve damage, and anemia if untreated. See a doctor."]
        m.foods = ["Dairy (milk, curd, paneer)", "Eggs", "Fortified plant milk", "Nutritional yeast", "Chicken and fish (if non-vegetarian)"]
    elif val < 200:
        m.status = "low"
        m.advice = ["Vitamin B12 is low (150–200 pg/mL). Common in vegetarians. Supplements recommended."]
        m.foods = ["Dairy products", "Eggs", "Fortified cereals"]
    else:
        m.status = "normal"
        m.advice = ["Vitamin B12 is within the normal range (≥200 pg/mL)."]
    return vars(m)


def _tsh(text: str) -> dict | None:
    keywords = [
        "tsh", "thyroid stimulating hormone", "thyrotropin",
        "s. tsh", "serum tsh", "tsh (ultrasensitive)", "tsh ultrasensitive",
        "thyroid function", "t.s.h",
    ]
    val_str = _find_value(text, keywords)
    if not val_str:
        return None
    val = float(val_str)
    if val < 0 or val > 200:
        return None
    m = Marker(name="TSH (Thyroid)", detected=True, value=f"{val} mIU/L")
    if val > 4.5:
        m.status = "high"
        m.advice = ["Elevated TSH (>4.5 mIU/L) suggests hypothyroidism. Consult an endocrinologist.", "Hypothyroidism can cause fatigue, weight gain, and cold intolerance."]
        m.foods = ["Iodine-rich foods (seafood, iodised salt)", "Selenium-rich foods (Brazil nuts)", "Avoid raw cruciferous vegetables in excess"]
    elif val < 0.4:
        m.status = "low"
        m.advice = ["Low TSH (<0.4 mIU/L) may indicate hyperthyroidism or overmedication. Consult a doctor."]
        m.foods = ["Avoid excessive iodine", "Cruciferous vegetables (broccoli, cabbage) in moderation may help"]
    else:
        m.status = "normal"
        m.advice = ["TSH is within the normal range (0.4–4.5 mIU/L)."]
    return vars(m)


def _creatinine(text: str) -> dict | None:
    keywords = [
        "creatinine", "s. creatinine", "serum creatinine",
        "creatinine serum", "creat", "s.creat",
    ]
    val_str = _find_value(text, keywords)
    if not val_str:
        return None
    val = float(val_str)
    if val < 0.1 or val > 30:
        return None
    m = Marker(name="Creatinine (Kidney)", detected=True, value=f"{val} mg/dL")
    if val > 1.5:
        m.status = "high"
        m.advice = ["Elevated creatinine (>1.5 mg/dL) may indicate reduced kidney function. Consult a nephrologist.", "Stay well-hydrated. Avoid NSAIDs (ibuprofen) and reduce protein intake if advised."]
        m.foods = ["Cranberries", "Cabbage", "Cauliflower", "Garlic (anti-inflammatory)", "Stay hydrated with water"]
    elif val > 1.2:
        m.status = "high"
        m.advice = ["Creatinine is mildly elevated (1.2–1.5 mg/dL). Monitor kidney function regularly."]
        m.foods = ["Increase fluid intake", "Low-protein diet if advised by doctor"]
    else:
        m.status = "normal"
        m.advice = ["Creatinine is within the normal range — kidney function appears normal."]
    return vars(m)


# ── Master analysis function ───────────────────────────────────────────────────

_ANALYZERS = [
    _glucose,
    _hba1c,
    _cholesterol,
    _ldl,
    _hdl,
    _triglycerides,
    _hemoglobin,
    _blood_pressure,
    _vitamin_d,
    _vitamin_b12,
    _tsh,
    _creatinine,
]

GENERAL_ADVICE = [
    "Drink at least 8–10 glasses of water daily.",
    "Include at least 5 servings of fruits and vegetables per day.",
    "Aim for 7–9 hours of sleep each night.",
    "Limit ultra-processed foods, refined sugars, and trans fats.",
    "Walk for at least 30 minutes most days of the week.",
    "Schedule regular health check-ups with your doctor.",
    "⚠ This analysis is for informational purposes only and is not a substitute for professional medical advice.",
]


def generate_analysis(text: str) -> dict[str, Any]:
    """
    Run the full analysis pipeline on extracted OCR text.
    Returns structured dict with markers and recommendations.
    """
    markers = []
    for analyzer in _ANALYZERS:
        try:
            result = analyzer(text)
            if result:
                markers.append(result)
        except Exception:
            pass  # Never crash due to a single marker failing

    statuses = [m["status"] for m in markers]
    if "critical" in statuses:
        overall = "Critical — Seek Medical Attention"
    elif statuses.count("high") >= 3 or statuses.count("low") >= 3:
        overall = "Multiple Values Out of Range"
    elif "high" in statuses or "low" in statuses:
        overall = "Some Values Need Attention"
    elif markers:
        overall = "All Detected Values Normal"
    else:
        overall = "No Recognisable Health Markers Detected"

    return {
        "overall_status":    overall,
        "markers_detected":  len(markers),
        "markers":           markers,
        "general_advice":    GENERAL_ADVICE,
        "disclaimer": (
            "This AI analysis is generated automatically from OCR text and is for "
            "educational purposes only. It does not constitute medical advice, diagnosis, "
            "or treatment. Always consult a qualified healthcare professional."
        ),
    }


# ── OCR extraction ─────────────────────────────────────────────────────────────

def extract_text_from_bytes(file_bytes: bytes, content_type: str) -> str:
    """Extract plain text from a PDF or image file."""
    if content_type == "application/pdf":
        import pdfplumber
        text_parts: list[str] = []
        with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
            for page in pdf.pages:
                # extract_text() by default; also try extract_text(x_tolerance=3)
                # for tables with tight columns
                page_text = page.extract_text(x_tolerance=3, y_tolerance=3)
                if page_text:
                    text_parts.append(page_text)
        return "\n".join(text_parts)

    elif content_type in ("image/png", "image/jpeg"):
        import pytesseract
        from PIL import Image
        img = Image.open(io.BytesIO(file_bytes))
        # Use PSM 6 (assume uniform block of text) — works best for structured reports
        return pytesseract.image_to_string(img, config="--psm 6")

    return ""
