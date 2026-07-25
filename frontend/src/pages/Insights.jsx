import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getModelsMetadata } from "../api/models";

// ── Constants ─────────────────────────────────────────────────────────────────

const DISEASE_META = {
  diabetes: {
    label: "Diabetes",
    dot:   "var(--chart-clay)",
    description: "Predicts risk based on glucose, BMI, insulin, age and 5 other metabolic markers.",
    features: 8,
    path: "/predict/diabetes",
  },
  heart: {
    label: "Heart Disease",
    dot:   "var(--chart-plum)",
    description: "Cardiovascular risk from ECG patterns, cholesterol, chest pain type and 10 other features.",
    features: 13,
    path: "/predict/heart",
  },
  tb: {
    label: "Tuberculosis",
    dot:   "var(--chart-slate)",
    description: "Screens for TB risk using 14 clinical symptom and exposure indicators.",
    features: 14,
    path: "/predict/tb",
  },
  cancer: {
    label: "Lung Cancer",
    dot:   "var(--chart-gold)",
    description: "Estimates lung cancer likelihood from 15 lifestyle, symptom, and risk factor inputs.",
    features: 15,
    path: "/predict/cancer",
  },
};

const MODEL_LABELS  = { lr: "Logistic Regression", rf: "Random Forest", xgb: "XGBoost" };
const MODEL_COLORS  = { lr: "var(--chart-slate)", rf: "var(--chart-gold)", xgb: "var(--chart-plum)" };
const MODEL_KEYS    = ["lr", "rf", "xgb"];

const METRICS_ORDER = ["accuracy", "roc_auc", "precision", "recall", "f1"];
const METRIC_LABEL  = {
  accuracy:  "Accuracy",
  roc_auc:   "ROC-AUC",
  precision: "Precision",
  recall:    "Recall",
  f1:        "F1 Score",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function pct(val) {
  if (val == null) return "—";
  return `${(val * 100).toFixed(1)}%`;
}

function getBestModel(models, metric = "roc_auc") {
  if (!models) return null;
  return Object.entries(models).reduce(
    (best, [key, m]) =>
      (m[metric] ?? 0) > (best[1][metric] ?? 0) ? [key, m] : best,
    ["", {}]
  )[0];
}

// ── Sub-components ────────────────────────────────────────────────────────────

function MetricBar({ value, color }) {
  const pctVal = Math.round((value ?? 0) * 100);
  return (
    <div className="flex items-center gap-2">
      <div
        className="flex-1 rounded-full overflow-hidden"
        style={{ height: 5, backgroundColor: "var(--border-soft)" }}
      >
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pctVal}%`, backgroundColor: color }}
        />
      </div>
      <span
        className="text-xs font-mono font-semibold w-10 text-right"
        style={{ color }}
      >
        {pct(value)}
      </span>
    </div>
  );
}

function DiseaseLeaderboard({ meta }) {
  const dm = DISEASE_META[meta.disease] ?? {};
  const models = meta.models ?? {};
  const bestKey = getBestModel(models, "roc_auc");
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-white border border-border rounded-xl overflow-hidden">
      {/* Coloured top accent */}
      <div className="h-1" style={{ backgroundColor: dm.dot ?? "var(--ink-ghost)" }} />

      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2.5">
            <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: dm.dot ?? "var(--ink-ghost)" }} />
            <h2 className="font-semibold text-ink">{dm.label ?? meta.disease}</h2>
          </div>
          {bestKey && (
            <span
              className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full"
              style={{ color: MODEL_COLORS[bestKey], backgroundColor: `color-mix(in srgb, ${MODEL_COLORS[bestKey]} 12%, white)` }}
            >
              Best: {MODEL_LABELS[bestKey]}
            </span>
          )}
        </div>

        <p className="text-xs text-ink-light mb-5">{dm.description}</p>

        {/* Summary stats row */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          {MODEL_KEYS.map((key) => {
            const m = models[key];
            if (!m) return null;
            const color = MODEL_COLORS[key];
            const isBest = key === bestKey;
            return (
              <div
                key={key}
                className="rounded-lg px-3 py-3 text-center"
                style={{
                  backgroundColor: isBest ? `color-mix(in srgb, ${color} 10%, white)` : "var(--parchment-lo)",
                  border: `1px solid ${isBest ? color : "var(--border)"}`,
                }}
              >
                <p className="text-[10px] font-mono text-ink-ghost mb-1">{key.toUpperCase()}</p>
                <p className="text-lg font-serif font-semibold" style={{ color }}>{pct(m.roc_auc)}</p>
                <p className="text-[10px] text-ink-ghost">ROC-AUC</p>
              </div>
            );
          })}
        </div>

        {/* Expanded metrics table */}
        <button
          onClick={() => setExpanded((e) => !e)}
          className="flex items-center gap-1.5 text-xs text-terra hover:text-terra-dark transition-colors font-medium mb-0"
        >
          <svg
            className={`w-3.5 h-3.5 transition-transform ${expanded ? "rotate-90" : ""}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
          {expanded ? "Hide" : "Show"} full metrics
        </button>

        {expanded && (
          <div className="mt-4 border-t border-border-soft pt-4 space-y-4">
            {METRICS_ORDER.map((metric) => (
              <div key={metric}>
                <p className="text-[10px] font-mono text-ink-ghost uppercase tracking-widest mb-2">
                  {METRIC_LABEL[metric]}
                </p>
                <div className="space-y-1.5">
                  {MODEL_KEYS.map((key) => {
                    const m = models[key];
                    if (!m || m[metric] == null) return null;
                    return (
                      <div key={key} className="flex items-center gap-3">
                        <span
                          className="text-[10px] font-mono w-8 shrink-0"
                          style={{ color: MODEL_COLORS[key] }}
                        >
                          {key.toUpperCase()}
                        </span>
                        <MetricBar value={m[metric]} color={MODEL_COLORS[key]} />
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Training info */}
            {meta.trained_at && (
              <p className="text-[10px] text-ink-ghost pt-2 border-t border-border-soft">
                Trained: {new Date(meta.trained_at).toLocaleDateString("en-IN", {
                  day: "numeric", month: "long", year: "numeric"
                })}
                {meta.training_samples && ` · ${meta.training_samples.toLocaleString()} samples`}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function Insights() {
  const navigate = useNavigate();
  const [metadata, setMetadata] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");

  useEffect(() => {
    getModelsMetadata()
      .then((d) => setMetadata(d.metadata ?? []))
      .catch(() => setError("Failed to load model data. Ensure the backend is running."))
      .finally(() => setLoading(false));
  }, []);

  // Sort metadata to match DISEASE_META display order
  const ORDER = ["diabetes", "heart", "tb", "cancer"];
  const sorted = [...metadata].sort(
    (a, b) => ORDER.indexOf(a.disease) - ORDER.indexOf(b.disease)
  );

  // Aggregate cross-disease stats
  const avgAuc = sorted.length
    ? sorted.reduce((sum, m) => {
        const best = m.models ? Math.max(...Object.values(m.models).map((x) => x.roc_auc ?? 0)) : 0;
        return sum + best;
      }, 0) / sorted.length
    : null;

  return (
    <div className="min-h-screen bg-parchment">
      {/* Top nav bar (Insights is public — no Sidebar) */}
      <nav className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-border px-6 py-3 flex items-center justify-between">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 text-ink hover:text-terra transition-colors"
        >
          <span className="w-5 h-5 rounded bg-terra flex items-center justify-center">
            <svg viewBox="0 0 16 16" className="w-3 h-3 text-white" fill="currentColor">
              <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zm0 2a5 5 0 1 1 0 10A5 5 0 0 1 8 3zm-.5 2v3.5l2.8 1.6-.5.9L6.5 9V5h1z" />
            </svg>
          </span>
          <span className="font-serif text-lg">TraceHealth</span>
        </button>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/predict")}
            className="text-sm text-ink-ghost hover:text-terra transition-colors"
          >
            Run Prediction
          </button>
          <button
            onClick={() => navigate("/login")}
            className="px-4 py-1.5 rounded-lg bg-terra text-white text-sm font-medium hover:bg-terra-dark transition-colors"
          >
            Sign in
          </button>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-6 py-12">
        {/* Hero */}
        <header className="mb-12 text-center">
          <p className="text-xs font-mono tracking-widest text-ink-ghost uppercase mb-4">
            Model Performance
          </p>
          <h1 className="font-serif text-4xl text-ink mb-4">
            Insights & Accuracy
          </h1>
          <p className="text-ink-light text-base max-w-xl mx-auto leading-relaxed">
            TraceHealth runs three independently trained models per disease — Logistic Regression,
            Random Forest, and XGBoost — and compares their results side-by-side.
          </p>

          {/* Summary stats */}
          {!loading && sorted.length > 0 && (
            <div className="flex items-center justify-center gap-8 mt-8">
              <div className="text-center">
                <p className="font-serif text-3xl font-semibold text-terra">12</p>
                <p className="text-xs text-ink-ghost mt-1">Models deployed</p>
              </div>
              <div className="w-px h-8 bg-border" />
              <div className="text-center">
                <p className="font-serif text-3xl font-semibold text-terra">4</p>
                <p className="text-xs text-ink-ghost mt-1">Diseases screened</p>
              </div>
              <div className="w-px h-8 bg-border" />
              <div className="text-center">
                <p className="font-serif text-3xl font-semibold text-terra">
                  {avgAuc != null ? `${(avgAuc * 100).toFixed(1)}%` : "—"}
                </p>
                <p className="text-xs text-ink-ghost mt-1">Avg. best ROC-AUC</p>
              </div>
            </div>
          )}
        </header>

        {/* Model legend */}
        <div className="flex items-center justify-center gap-6 mb-10">
          {MODEL_KEYS.map((key) => (
            <div key={key} className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: MODEL_COLORS[key] }} />
              <span className="text-xs text-ink-mid">{MODEL_LABELS[key]}</span>
            </div>
          ))}
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center gap-3 text-ink-light text-sm py-16">
            <div className="w-5 h-5 border-2 border-terra border-t-transparent rounded-full animate-spin" />
            Loading model data…
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="p-4 rounded-lg border border-status-high bg-status-high-dim text-status-high text-sm mb-8 text-center">
            {error}
          </div>
        )}

        {/* Leaderboard grid */}
        {!loading && sorted.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
            {sorted.map((meta) => (
              <DiseaseLeaderboard key={meta.disease} meta={meta} />
            ))}
          </div>
        )}

        {/* CTA section */}
        <div className="bg-white border border-border rounded-2xl p-8 text-center">
          <h2 className="font-serif text-2xl text-ink mb-3">Try a Screening</h2>
          <p className="text-sm text-ink-light mb-6 max-w-md mx-auto">
            Run all three models on your data and get a SHAP-explained comparison — free, no account required.
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            {Object.entries(DISEASE_META).map(([key, dm]) => (
              <button
                key={key}
                onClick={() => navigate(dm.path)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border
                  text-sm text-ink-mid hover:border-terra hover:text-terra hover:bg-terra-dim
                  transition-all"
              >
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: dm.dot }} />
                {dm.label}
              </button>
            ))}
          </div>
        </div>

        {/* Methodology note */}
        <div className="mt-10 p-5 bg-parchment-lo rounded-xl border border-border">
          <h3 className="text-sm font-semibold text-ink mb-2">Methodology</h3>
          <p className="text-xs text-ink-light leading-relaxed">
            Models were trained on publicly available medical datasets (PIMA Diabetes, Cleveland Heart Disease,
            WHO TB data, Lung Cancer Survey). Each model was evaluated using 5-fold cross-validation.
            Reported metrics are test-set scores on a held-out 20% split.
            SHAP values are computed per-prediction using TreeExplainer (RF, XGBoost) and
            LinearExplainer (Logistic Regression).
          </p>
          <p className="text-xs text-ink-ghost mt-3">
            ⚠ For educational purposes only. Not a clinical diagnostic tool.
          </p>
        </div>
      </main>
    </div>
  );
}
