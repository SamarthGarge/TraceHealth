import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/layout/Sidebar";
import { checkSymptoms } from "../api/symptomCheck";

// ── Symptom questions grouped by category ─────────────────────────────────────

const SYMPTOM_GROUPS = [
  {
    group: "General",
    symptoms: [
      { id: "fatigue",                label: "Fatigue or persistent tiredness" },
      { id: "unexplained_weight_loss",label: "Unexplained weight loss" },
      { id: "fever",                  label: "Fever (persistent or recurrent)" },
      { id: "loss_of_appetite",       label: "Loss of appetite" },
      { id: "night_sweats",           label: "Night sweats" },
    ],
  },
  {
    group: "Respiratory",
    symptoms: [
      { id: "persistent_cough",       label: "Persistent cough (3+ weeks)" },
      { id: "cough_blood",            label: "Coughing up blood or bloody mucus" },
      { id: "shortness_breath",       label: "Shortness of breath" },
      { id: "wheezing",               label: "Wheezing" },
      { id: "hoarseness",             label: "Hoarseness or voice changes" },
      { id: "recurrent_chest_infections", label: "Recurrent chest infections" },
    ],
  },
  {
    group: "Cardiovascular",
    symptoms: [
      { id: "chest_pain",             label: "Chest pain or pressure" },
      { id: "chest_tightness",        label: "Chest tightness" },
      { id: "palpitations",           label: "Heart palpitations" },
      { id: "dizziness",              label: "Dizziness or fainting" },
      { id: "pain_radiating_arm_jaw", label: "Pain radiating to arm, neck, or jaw" },
      { id: "swollen_ankles",         label: "Swollen ankles or legs" },
    ],
  },
  {
    group: "Metabolic / Blood Sugar",
    symptoms: [
      { id: "frequent_urination",     label: "Frequent urination" },
      { id: "excessive_thirst",       label: "Excessive thirst" },
      { id: "increased_hunger",       label: "Increased hunger even after eating" },
      { id: "blurred_vision",         label: "Blurred vision" },
      { id: "slow_wound_healing",     label: "Slow-healing wounds or cuts" },
      { id: "numbness_tingling",      label: "Numbness or tingling in hands/feet" },
      { id: "frequent_infections",    label: "Frequent infections (skin, urinary, gum)" },
      { id: "darkened_skin",          label: "Darkened skin patches (neck, armpits)" },
    ],
  },
  {
    group: "Lymph / Infection",
    symptoms: [
      { id: "swollen_lymph_nodes",    label: "Swollen lymph nodes" },
      { id: "recent_tb_contact",      label: "Recent contact with a TB-positive person" },
      { id: "immunocompromised",      label: "Immunocompromised (HIV, chemotherapy, etc.)" },
    ],
  },
  {
    group: "Risk Factors",
    symptoms: [
      { id: "smoking",                label: "Current or past smoker" },
      { id: "high_blood_pressure",    label: "Diagnosed high blood pressure" },
      { id: "high_cholesterol",       label: "Diagnosed high cholesterol" },
      { id: "overweight_obese",       label: "Overweight or obese" },
      { id: "age_over_45",            label: "Age 45 or older" },
      { id: "age_over_50",            label: "Age 50 or older" },
      { id: "family_history_diabetes",label: "Family history of diabetes" },
      { id: "family_history_heart",   label: "Family history of heart disease" },
      { id: "family_history_cancer",  label: "Family history of cancer" },
    ],
  },
];

// ── Disease display meta ───────────────────────────────────────────────────────

const DISEASE_META = {
  diabetes: { dot: "var(--chart-clay)",  path: "/predict/diabetes" },
  heart:    { dot: "var(--chart-plum)",  path: "/predict/heart" },
  tb:       { dot: "var(--chart-slate)", path: "/predict/tb" },
  cancer:   { dot: "var(--chart-gold)",  path: "/predict/cancer" },
};

const LEVEL_COLOR = {
  high:     { fg: "var(--status-high)",     bg: "var(--status-high-dim)" },
  moderate: { fg: "var(--status-moderate)", bg: "var(--status-moderate-dim)" },
  low:      { fg: "var(--status-low)",      bg: "var(--status-low-dim)" },
};

// ── Sub-components ────────────────────────────────────────────────────────────

function SymptomToggle({ id, label, checked, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(id, !checked)}
      className={`flex items-center gap-3 w-full px-4 py-3 rounded-lg border text-left
        transition-all duration-150 text-sm
        ${checked
          ? "border-terra bg-terra-dim text-terra font-medium"
          : "border-border bg-white text-ink-mid hover:border-border-strong hover:text-ink"
        }`}
    >
      {/* Checkbox indicator */}
      <span
        className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors
          ${checked ? "bg-terra border-terra" : "border-border-strong"}`}
      >
        {checked && (
          <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </span>
      {label}
    </button>
  );
}

function ReferralCard({ referral, onRunPrediction }) {
  const meta    = DISEASE_META[referral.disease] ?? {};
  const colors  = LEVEL_COLOR[referral.level]    ?? LEVEL_COLOR.low;

  return (
    <div className="bg-white border border-border rounded-xl p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: meta.dot ?? "var(--ink-ghost)" }} />
          <span className="font-semibold text-sm text-ink">{referral.label}</span>
        </div>
        <span
          className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase"
          style={{ color: colors.fg, backgroundColor: colors.bg }}
        >
          {referral.level}
        </span>
      </div>

      {/* Score bar */}
      <div className="mb-1 flex items-center justify-between">
        <span className="text-xs text-ink-ghost">Relevance</span>
        <span className="text-xs font-mono font-semibold" style={{ color: colors.fg }}>
          {referral.score}%
        </span>
      </div>
      <div
        className="w-full rounded-full overflow-hidden mb-3"
        style={{ height: 5, backgroundColor: "var(--border-soft)" }}
      >
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${referral.score}%`, backgroundColor: colors.fg }}
        />
      </div>

      {/* Reason */}
      <p className="text-xs text-ink-light leading-relaxed mb-4">{referral.reason}</p>

      {/* CTA */}
      {referral.run_prediction && (
        <button
          onClick={() => onRunPrediction(referral.disease)}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-semibold
            transition-colors"
          style={{ backgroundColor: colors.bg, color: colors.fg }}
        >
          Run {referral.label} Prediction
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </button>
      )}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function SymptomCheck() {
  const navigate = useNavigate();

  const [symptoms, setSymptoms]   = useState({});       // symptom_id → boolean
  const [step, setStep]           = useState("form");   // "form" | "results"
  const [result, setResult]       = useState(null);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");

  const checkedCount = Object.values(symptoms).filter(Boolean).length;

  function handleToggle(id, value) {
    setSymptoms((s) => ({ ...s, [id]: value }));
  }

  async function handleSubmit() {
    setLoading(true);
    setError("");
    try {
      const data = await checkSymptoms(symptoms);
      setResult(data);
      setStep("results");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    setSymptoms({});
    setResult(null);
    setStep("form");
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="page-shell">
      <Sidebar />

      <main className="page-main bg-parchment">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Header */}
        <header className="mb-6 sm:mb-8 animate-fade-up">
          <p className="text-[10px] font-mono tracking-widest text-ink-ghost uppercase mb-2">
            Triage Wizard
          </p>
          <h1 className="font-display text-2xl sm:text-3xl font-semibold text-ink mb-2">Symptom Check</h1>
          <p className="text-ink-light text-sm max-w-xl">
            Select the symptoms you are currently experiencing. This tool provides
            educational guidance only — it is not a medical diagnosis.
          </p>
        </header>

        {/* ── Step: Form ─────────────────────────────────────────────────── */}
        {step === "form" && (
          <div>
            {/* Progress indicator */}
            <div className="flex items-center gap-2 mb-6">
              <div
                className="h-1.5 rounded-full transition-all duration-300 bg-terra"
                style={{ width: checkedCount > 0 ? `${Math.min(checkedCount * 3, 100)}%` : "4px" }}
              />
              <span className="text-xs font-mono text-ink-ghost shrink-0">
                {checkedCount} selected
              </span>
            </div>

            {/* Symptom groups */}
            <div className="space-y-8">
              {SYMPTOM_GROUPS.map((group) => (
                <div key={group.group}>
                  <p className="text-xs font-mono tracking-widest text-ink-ghost uppercase mb-3">
                    {group.group}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {group.symptoms.map((s) => (
                      <SymptomToggle
                        key={s.id}
                        id={s.id}
                        label={s.label}
                        checked={!!symptoms[s.id]}
                        onChange={handleToggle}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Error */}
            {error && (
              <div className="mt-6 p-4 rounded-lg border border-status-high bg-status-high-dim text-status-high text-sm">
                {error}
              </div>
            )}

            {/* Submit */}
            <div className="mt-8 flex items-center gap-4">
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="flex items-center gap-2 px-6 py-3 rounded-lg bg-terra text-white text-sm font-semibold
                  hover:bg-terra-dark transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Analysing…
                  </>
                ) : (
                  <>
                    Analyse Symptoms
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </>
                )}
              </button>

              {checkedCount > 0 && (
                <button
                  onClick={() => setSymptoms({})}
                  className="text-sm text-ink-ghost hover:text-ink transition-colors"
                >
                  Clear all
                </button>
              )}
            </div>

            <p className="mt-4 text-xs text-ink-ghost">
              ⚠ This is a self-assessment tool, not a diagnostic service.
            </p>
          </div>
        )}

        {/* ── Step: Results ──────────────────────────────────────────────── */}
        {step === "results" && result && (
          <div>
            {/* Summary banner */}
            <div className="bg-white border border-border rounded-xl p-5 mb-6">
              <p className="text-xs font-mono tracking-widest text-ink-ghost uppercase mb-2">
                Summary
              </p>
              <p className="text-sm text-ink leading-relaxed">{result.summary}</p>
            </div>

            {/* Referral cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
              {result.referrals.map((r) => (
                <ReferralCard
                  key={r.disease}
                  referral={r}
                  onRunPrediction={(disease) => navigate(`/predict/${disease}`)}
                />
              ))}
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={handleReset}
                className="px-5 py-2.5 rounded-lg border border-border text-sm text-ink-mid
                  hover:border-border-strong hover:text-ink transition-colors"
              >
                ← Start over
              </button>
              <button
                onClick={() => navigate("/predict")}
                className="px-5 py-2.5 rounded-lg bg-terra text-white text-sm font-semibold
                  hover:bg-terra-dark transition-colors"
              >
                Run a full prediction
              </button>
            </div>

            <p className="mt-6 text-xs text-ink-ghost leading-relaxed max-w-lg">
              ⚠ These results are based on symptom pattern matching and do not constitute
              a medical diagnosis. Always consult a qualified healthcare professional.
            </p>
          </div>
        )}
        </div>
      </main>
    </div>
  );
}
