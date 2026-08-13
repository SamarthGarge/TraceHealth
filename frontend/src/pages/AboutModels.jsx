/**
 * AboutModels.jsx — Explains the ML models used by TraceHealth per disease.
 * Fetches live accuracy metrics from /api/models/metadata.
 * Public page — accessible without login. Uses Sidebar when authenticated.
 */

import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Sidebar from "../components/layout/Sidebar";
import Header from "../components/layout/Header";
import { getModelsMetadata } from "../api/models";

// ── Static model descriptions ─────────────────────────────────────────────────

const DISEASE_INFO = {
  diabetes: {
    label: "Diabetes",
    dot: "var(--chart-clay)",
    dataset: "PIMA Indian Diabetes Dataset",
    datasetLink: "https://www.kaggle.com/datasets/uciml/pima-indians-diabetes-database",
    samples: "768 samples, 8 features",
    task: "Binary classification (Diabetic / Non-Diabetic)",
    features: ["Glucose", "BMI", "Insulin", "Age", "Blood Pressure", "Skin Thickness", "Pregnancies", "Diabetes Pedigree"],
  },
  heart: {
    label: "Heart Disease",
    dot: "var(--chart-plum)",
    dataset: "Cleveland Heart Disease Dataset",
    datasetLink: "https://archive.ics.uci.edu/dataset/45/heart+disease",
    samples: "303 samples, 13 features",
    task: "Binary classification (Disease / No Disease)",
    features: ["Age", "Sex", "Chest Pain Type", "Resting BP", "Cholesterol", "Fasting Blood Sugar", "Resting ECG", "Max Heart Rate", "Exercise Angina", "ST Depression", "ST Slope", "Major Vessels", "Thal"],
  },
  tb: {
    label: "Tuberculosis",
    dot: "var(--chart-slate)",
    dataset: "WHO TB Clinical Indicators",
    datasetLink: "https://www.who.int/teams/global-tuberculosis-programme/data",
    samples: "Clinical symptom dataset, 14 features",
    task: "Binary classification (TB Risk / No Risk)",
    features: ["Cough Duration", "Fever", "Night Sweats", "Weight Loss", "Haemoptysis", "Fatigue", "Chest Pain", "Contact with TB", "HIV Status", "BCG Vaccination", "Smoking", "Alcohol Use", "Age", "Gender"],
  },
  cancer: {
    label: "Lung Cancer",
    dot: "var(--chart-gold)",
    dataset: "Lung Cancer Survey Dataset",
    datasetLink: "https://www.kaggle.com/datasets/mysarahmadbhat/lung-cancer",
    samples: "309 samples, 15 features",
    task: "Binary classification (Cancer / No Cancer)",
    features: ["Gender", "Age", "Smoking", "Yellow Fingers", "Anxiety", "Peer Pressure", "Chronic Disease", "Fatigue", "Allergy", "Wheezing", "Alcohol Consuming", "Coughing", "Shortness of Breath", "Swallowing Difficulty", "Chest Pain"],
  },
};

const MODEL_META = {
  lr:  { label: "Logistic Regression", color: "var(--chart-slate)", short: "LR" },
  rf:  { label: "Random Forest",       color: "var(--chart-gold)",  short: "RF" },
  xgb: { label: "XGBoost",            color: "var(--chart-plum)",  short: "XGB" },
};

const METRICS = ["accuracy", "roc_auc", "precision", "recall", "f1"];
const METRIC_LABELS = {
  accuracy:  "Accuracy",
  roc_auc:   "ROC-AUC",
  precision: "Precision",
  recall:    "Recall",
  f1:        "F1 Score",
};

const METHODOLOGY = [
  {
    step: "01",
    title: "Data Preprocessing",
    desc: "Missing values imputed with median/mode. Features standardised using StandardScaler. Categorical variables one-hot encoded.",
  },
  {
    step: "02",
    title: "5-Fold Cross-Validation",
    desc: "All models evaluated with stratified 5-fold CV to prevent data leakage and get reliable generalisation estimates.",
  },
  {
    step: "03",
    title: "Model Training",
    desc: "Logistic Regression, Random Forest, and XGBoost trained per disease. Hyperparameters tuned via grid search.",
  },
  {
    step: "04",
    title: "Ensemble Prediction",
    desc: "Final prediction is the mean probability across all three models. Risk level thresholds (High/Moderate/Low) are disease-specific.",
  },
  {
    step: "05",
    title: "SHAP Explainability",
    desc: "SHAP values computed per prediction (TreeExplainer for RF/XGBoost, LinearExplainer for LR) to explain which features drove the result.",
  },
  {
    step: "06",
    title: "Grad-CAM for Images",
    desc: "For TB (X-ray) and Lung Cancer (CT), a fine-tuned CNN generates Grad-CAM heatmaps highlighting diagnostically relevant image regions.",
  },
];

// ── Sub-components ─────────────────────────────────────────────────────────────

function MetricBar({ value, color }) {
  const pctVal = Math.round((value ?? 0) * 100);
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-parchment rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pctVal}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-xs font-mono text-ink-ghost w-10 text-right">{pctVal}%</span>
    </div>
  );
}

function DiseaseCard({ diseaseKey, metadata }) {
  const info = DISEASE_INFO[diseaseKey];
  const models = metadata?.models ?? {};
  if (!info) return null;

  return (
    <div className="bg-white border border-border rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="px-6 py-5 border-b border-border flex items-center gap-3">
        <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: info.dot }} />
        <div>
          <h3 className="font-semibold text-ink">{info.label}</h3>
          <p className="text-xs text-ink-ghost">{info.task}</p>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Dataset info */}
        <div>
          <p className="text-xs font-semibold text-ink-mid uppercase tracking-widest mb-2">Dataset</p>
          <a
            href={info.datasetLink}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-terra hover:underline font-medium"
          >
            {info.dataset} ↗
          </a>
          <p className="text-xs text-ink-ghost mt-0.5">{info.samples}</p>
        </div>

        {/* Input features */}
        <div>
          <p className="text-xs font-semibold text-ink-mid uppercase tracking-widest mb-2">
            Input Features ({info.features.length})
          </p>
          <div className="flex flex-wrap gap-1.5">
            {info.features.map((f) => (
              <span key={f} className="text-[11px] px-2 py-0.5 bg-parchment rounded-full text-ink-mid border border-border">
                {f}
              </span>
            ))}
          </div>
        </div>

        {/* Model metrics */}
        {Object.keys(models).length > 0 && (
          <div>
            <p className="text-xs font-semibold text-ink-mid uppercase tracking-widest mb-3">
              Model Performance (held-out test set)
            </p>
            <div className="space-y-4">
              {["lr", "rf", "xgb"].map((mk) => {
                const m = models[mk];
                if (!m) return null;
                const meta = MODEL_META[mk];
                return (
                  <div key={mk}>
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: meta.color }}
                      />
                      <span className="text-xs font-medium text-ink">{meta.label}</span>
                    </div>
                    <div className="space-y-1.5 pl-4">
                      {METRICS.map((metric) => (
                        <div key={metric} className="grid grid-cols-[90px_1fr] items-center gap-2">
                          <span className="text-[11px] text-ink-ghost">{METRIC_LABELS[metric]}</span>
                          <MetricBar value={m[metric]} color={meta.color} />
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* No metadata yet */}
        {Object.keys(models).length === 0 && (
          <div className="text-xs text-ink-ghost bg-parchment rounded-lg px-4 py-3 border border-border">
            Performance metrics not yet available — run training scripts to populate.
          </div>
        )}

        {/* CTA */}
        <Link
          to={`/predict/${diseaseKey}`}
          className="inline-flex items-center gap-2 text-xs font-semibold text-terra
            hover:text-terra-dark transition-colors"
        >
          Try {info.label} screening
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </Link>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function AboutModels() {
  const { isAuthenticated } = useAuth();
  const [metaMap, setMetaMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");

  useEffect(() => {
    getModelsMetadata()
      .then(({ metadata }) => {
        const map = {};
        metadata.forEach((m) => { map[m.disease] = m; });
        setMetaMap(map);
      })
      .catch(() => setError("Could not load model metrics — backend may not be running."))
      .finally(() => setLoading(false));
  }, []);

  const content = (
    <>
      {/* Header */}
      <header className="mb-6 sm:mb-8 animate-fade-up">
        <p className="text-[10px] font-mono tracking-widest text-ink-ghost uppercase mb-2">
          Transparency
        </p>
        <h1 className="font-display text-2xl sm:text-3xl font-semibold text-ink mb-2">About the Models</h1>
        <p className="text-ink-light text-sm max-w-xl">
          TraceHealth uses three independently trained ML models per disease — Logistic Regression, Random Forest, and XGBoost — and compares their results side by side with SHAP explanations.
        </p>
      </header>

      {/* Model legend */}
      <div className="flex flex-wrap items-center gap-4 mb-8 p-4 bg-white border border-border rounded-xl">
        {Object.entries(MODEL_META).map(([k, m]) => (
          <div key={k} className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: m.color }} />
            <span className="text-xs text-ink-mid font-medium">{m.label}</span>
          </div>
        ))}
        <span className="text-xs text-ink-ghost ml-auto hidden sm:block">
          Metrics from 80/20 train-test split, 5-fold CV
        </span>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 p-4 rounded-lg border border-status-med bg-status-med-dim text-status-med text-sm">
          {error}
        </div>
      )}

      {/* Disease cards */}
      {loading ? (
        <div className="flex items-center gap-3 text-ink-light text-sm">
          <div className="w-4 h-4 border-2 border-terra border-t-transparent rounded-full animate-spin" />
          Loading model metrics…
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-12">
          {Object.keys(DISEASE_INFO).map((dk) => (
            <DiseaseCard key={dk} diseaseKey={dk} metadata={metaMap[dk] || {}} />
          ))}
        </div>
      )}

      {/* Methodology section */}
      <section>
        <div className="flex items-center gap-3 mb-6">
          <div className="flex-1 h-px bg-border" />
          <p className="text-xs font-mono text-ink-ghost uppercase tracking-widest shrink-0">
            Methodology
          </p>
          <div className="flex-1 h-px bg-border" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {METHODOLOGY.map((m) => (
            <div key={m.step} className="bg-white border border-border rounded-xl p-5">
              <p className="text-xs font-mono text-terra mb-2">{m.step}</p>
              <p className="text-sm font-semibold text-ink mb-1">{m.title}</p>
              <p className="text-xs text-ink-light leading-relaxed">{m.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Disclaimer */}
      <p className="mt-10 text-xs text-ink-ghost leading-relaxed max-w-xl">
        ⚠ Performance metrics are computed on held-out test data and may not reflect
        real-world clinical performance. These models are for educational screening
        only and are not validated medical devices.
      </p>
    </>
  );

  if (isAuthenticated) {
    return (
      <div className="page-shell">
        <Sidebar />
        <main className="page-main bg-parchment">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
            {content}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-parchment">
      <Header />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-10">{content}</div>
    </div>
  );
}
