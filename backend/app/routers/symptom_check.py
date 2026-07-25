"""
Symptom Check router — rule-based triage wizard.

No ML model. Uses weighted symptom scoring to produce a referral
suggestion for each disease, helping users decide which prediction
to run next.

Endpoint:
  POST /api/symptom-check   — submit symptom answers, get referral suggestions

Public — no authentication required (matches frontend route config).
"""

from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()


# ── Symptom definitions ────────────────────────────────────────────────────────

class SymptomCheckRequest(BaseModel):
    """
    Flat dict of symptom flags submitted by the user.
    Each key is a symptom ID; value is True (present) or False (absent).
    Unknown keys are silently ignored.
    """
    symptoms: dict[str, bool]


class DiseaseReferral(BaseModel):
    disease: str       # "diabetes" | "heart" | "tb" | "cancer"
    label: str
    score: int         # 0–100 normalised relevance score
    level: str         # "high" | "moderate" | "low"
    reason: str        # human-readable explanation
    run_prediction: bool  # whether to suggest running the prediction tool


class SymptomCheckResponse(BaseModel):
    referrals: list[DiseaseReferral]
    summary: str


# ── Scoring weights per disease ────────────────────────────────────────────────
# Format: { symptom_id: weight }
# Weights are relative — they are normalised to 0-100 after summing.

DIABETES_WEIGHTS: dict[str, int] = {
    "frequent_urination":        10,
    "excessive_thirst":          10,
    "unexplained_weight_loss":    8,
    "blurred_vision":             7,
    "slow_wound_healing":         7,
    "fatigue":                    5,
    "numbness_tingling":          6,
    "frequent_infections":        5,
    "increased_hunger":           5,
    "darkened_skin":              4,
    "age_over_45":                4,
    "family_history_diabetes":    5,
    "overweight_obese":           6,
}

HEART_WEIGHTS: dict[str, int] = {
    "chest_pain":                15,
    "chest_tightness":           12,
    "shortness_breath":          10,
    "palpitations":               8,
    "dizziness":                  7,
    "swollen_ankles":             7,
    "fatigue":                    5,
    "pain_radiating_arm_jaw":    10,
    "high_blood_pressure":        8,
    "high_cholesterol":           7,
    "smoking":                    6,
    "family_history_heart":       6,
    "age_over_50":                5,
}

TB_WEIGHTS: dict[str, int] = {
    "persistent_cough":          12,
    "cough_blood":               15,
    "night_sweats":              10,
    "fever":                     10,
    "unexplained_weight_loss":    9,
    "fatigue":                    6,
    "chest_pain":                 7,
    "loss_of_appetite":           6,
    "swollen_lymph_nodes":        8,
    "recent_tb_contact":         12,
    "immunocompromised":          8,
}

CANCER_WEIGHTS: dict[str, int] = {
    "persistent_cough":          10,
    "cough_blood":               15,
    "shortness_breath":          10,
    "chest_pain":                 8,
    "hoarseness":                 7,
    "unexplained_weight_loss":    9,
    "fatigue":                    5,
    "smoking":                   15,
    "wheezing":                   7,
    "recurrent_chest_infections": 8,
    "age_over_50":                5,
    "family_history_cancer":      6,
}

ALL_DISEASE_WEIGHTS = {
    "diabetes": (DIABETES_WEIGHTS, "Diabetes",     "diabetes"),
    "heart":    (HEART_WEIGHTS,    "Heart Disease", "heart"),
    "tb":       (TB_WEIGHTS,       "Tuberculosis",  "tb"),
    "cancer":   (CANCER_WEIGHTS,   "Lung Cancer",   "cancer"),
}

LEVEL_THRESHOLDS = {
    "high":     40,   # score >= 40 → high relevance
    "moderate": 20,   # score >= 20 → moderate
}


def _score_disease(symptoms: dict[str, bool], weights: dict[str, int]) -> int:
    """
    Compute a 0-100 normalised score for a disease given the user's symptoms.
    """
    max_possible = sum(weights.values())
    if max_possible == 0:
        return 0
    earned = sum(w for s, w in weights.items() if symptoms.get(s, False))
    return min(100, round((earned / max_possible) * 100))


def _level(score: int) -> str:
    if score >= LEVEL_THRESHOLDS["high"]:
        return "high"
    if score >= LEVEL_THRESHOLDS["moderate"]:
        return "moderate"
    return "low"


def _reason(disease_key: str, score: int, symptoms: dict[str, bool], weights: dict[str, int]) -> str:
    """Build a short human-readable explanation of the top matching symptoms."""
    matched = [s for s, w in sorted(weights.items(), key=lambda x: -x[1]) if symptoms.get(s, False)]
    if not matched:
        return "No strong indicators detected for this condition."
    top = matched[:3]
    readable = [s.replace("_", " ") for s in top]
    if len(readable) == 1:
        return f"You reported {readable[0]}, which can be associated with {disease_key}."
    joined = ", ".join(readable[:-1]) + f" and {readable[-1]}"
    return f"You reported {joined} — symptoms associated with this condition."


# ── Endpoint ───────────────────────────────────────────────────────────────────

@router.post("/symptom-check", response_model=SymptomCheckResponse)
async def symptom_check(body: SymptomCheckRequest):
    """
    Score the user's symptoms against all 4 disease profiles and return
    ranked referral suggestions.
    """
    symptoms = body.symptoms

    referrals: list[DiseaseReferral] = []
    for key, (weights, label, disease) in ALL_DISEASE_WEIGHTS.items():
        score = _score_disease(symptoms, weights)
        level = _level(score)
        reason = _reason(key, score, symptoms, weights)
        referrals.append(DiseaseReferral(
            disease=disease,
            label=label,
            score=score,
            level=level,
            reason=reason,
            run_prediction=(level in ("high", "moderate")),
        ))

    # Sort by score descending
    referrals.sort(key=lambda r: -r.score)

    # Build summary
    high = [r.label for r in referrals if r.level == "high"]
    moderate = [r.label for r in referrals if r.level == "moderate"]

    if high:
        summary = f"High relevance detected for {', '.join(high)}. Consider running a detailed prediction."
    elif moderate:
        summary = f"Moderate relevance for {', '.join(moderate)}. A prediction may provide more clarity."
    else:
        summary = "No strong indicators detected. Maintain a healthy lifestyle and consult your doctor for routine check-ups."

    return SymptomCheckResponse(referrals=referrals, summary=summary)
