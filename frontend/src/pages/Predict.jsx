import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Sidebar from "../components/layout/Sidebar";
import FeatureInput from "../components/predict/FeatureInput";
import ModelResultCard from "../components/predict/ModelResultCard";
import EnsembleBadge from "../components/predict/EnsembleBadge";
import DiseaseCard from "../components/predict/DiseaseCard";
import ImageUploadForm from "../components/predict/ImageUploadForm";
import GradCamOverlay from "../components/predict/GradCamOverlay";
import { getFeatures, runPrediction } from "../api/predictions";

// Diseases that support image-based prediction
const IMAGE_DISEASES = ["tb", "cancer"];

const DISEASES = ["diabetes", "heart", "tb", "cancer"];

const DISEASE_LABELS = {
  diabetes: "Diabetes",
  heart:    "Heart Disease",
  tb:       "Tuberculosis",
  cancer:   "Lung Cancer",
};

const EASE = "cubic-bezier(0.23, 1, 0.32, 1)";

export default function Predict() {
  const { disease } = useParams();
  const navigate = useNavigate();

  // ── State ──────────────────────────────────────────────────────────────────
  const [features, setFeatures]     = useState([]);
  const [values,   setValues]       = useState({});
  const [errors,   setErrors]       = useState({});
  const [loading,  setLoading]      = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result,   setResult]       = useState(null);
  const [apiError, setApiError]     = useState("");

  // Image prediction tab state
  const supportsImage = IMAGE_DISEASES.includes(disease);
  const [inputTab,    setInputTab]    = useState("tabular");
  const [imageResult, setImageResult] = useState(null);

  // ── Load features when disease param changes ───────────────────────────────
  useEffect(() => {
    if (!disease) return;
    if (!DISEASES.includes(disease)) {
      navigate("/404", { replace: true });
      return;
    }

    // Reset ALL prediction state when disease changes
    setResult(null);
    setApiError("");
    setErrors({});
    setImageResult(null);
    setInputTab("tabular");
    setLoading(true);

    getFeatures(disease)
      .then(({ features: fList }) => {
        setFeatures(fList);
        setValues(Object.fromEntries(fList.map((f) => [f, ""])));
      })
      .catch(() => setApiError("Failed to load feature list. Is the backend running?"))
      .finally(() => setLoading(false));
  }, [disease, navigate]);


  // ── If no disease param → show disease selector ────────────────────────────
  if (!disease) {
    return (
      <div className="page-shell">
        <Sidebar />
        <main className="page-main bg-parchment">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
            <header className="mb-6 sm:mb-8 animate-fade-up">
              <p className="text-[10px] font-mono tracking-widest text-ink-ghost uppercase mb-2">
                Risk Screening
              </p>
              <h1 className="font-display text-2xl sm:text-3xl font-semibold text-ink mb-2">Select a Disease</h1>
              <p className="text-ink-light text-sm max-w-lg">
                Choose a condition to screen. Our models will compare Logistic Regression,
                Random Forest, and XGBoost results side-by-side with SHAP explanations.
              </p>
            </header>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              {DISEASES.map((d, idx) => (
                <div key={d} className="animate-fade-up" style={{ animationDelay: `${idx * 50}ms` }}>
                  <DiseaseCard diseaseKey={d} />
                </div>
              ))}
            </div>

            <p className="mt-8 text-xs text-ink-ghost leading-relaxed max-w-lg">
              This tool is for educational screening only. Results are not a medical
              diagnosis. Always consult a qualified healthcare professional.
            </p>
          </div>
        </main>
      </div>
    );
  }

  // ── Handlers ───────────────────────────────────────────────────────────────
  function handleChange(name, val) {
    setValues((v) => ({ ...v, [name]: val }));
    setErrors((e) => ({ ...e, [name]: undefined }));
  }

  function validate() {
    const errs = {};
    for (const f of features) {
      const v = values[f];
      if (v === "" || v === undefined || v === null) {
        errs[f] = "Required";
      } else if (isNaN(Number(v))) {
        errs[f] = "Must be a number";
      }
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    setApiError("");
    setResult(null);

    const numericValues = Object.fromEntries(
      Object.entries(values).map(([k, v]) => [k, Number(v)])
    );

    try {
      const data = await runPrediction(disease, numericValues);
      setResult(data);
      setTimeout(() => {
        document.getElementById("results-section")?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    } catch (err) {
      setApiError(
        err?.response?.data?.detail ?? "Prediction failed. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  // ── Render: Form + Results ─────────────────────────────────────────────────
  return (
    <div className="page-shell">
      <Sidebar />

      <main className="page-main bg-parchment">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-xs font-mono text-ink-ghost mb-4 sm:mb-6 animate-fade-up">
            <button
              onClick={() => navigate("/predict")}
              className="hover:text-terra transition-colors active:scale-[0.97]"
              style={{ transitionTimingFunction: EASE }}
            >
              Predict
            </button>
            <span className="text-ink-ghost/40">/</span>
            <span className="text-ink-mid">{DISEASE_LABELS[disease]}</span>
          </div>

          <header className="mb-5 sm:mb-6 animate-fade-up" style={{ animationDelay: "50ms" }}>
            <p className="text-[10px] font-mono tracking-widest text-ink-ghost uppercase mb-2">
              Risk Screening
            </p>
            <h1 className="font-display text-2xl sm:text-3xl font-semibold text-ink mb-2">
              {DISEASE_LABELS[disease]} Prediction
            </h1>
            <p className="text-ink-light text-sm">
              {supportsImage
                ? "Enter patient values or upload a medical image for AI-based screening."
                : "Enter patient values below. All three models will run simultaneously and results will be compared with SHAP explanations."}
            </p>
          </header>

          {/* ── Tab switcher (only for image-supported diseases) ── */}
          {supportsImage && (
            <div className="flex gap-1 bg-parchment-lo border border-border rounded-xl p-1 mb-5 sm:mb-6 w-fit animate-fade-up" style={{ animationDelay: "100ms" }}>
              {[
                { key: "tabular", label: "Clinical Data" },
                { key: "image",   label: "Upload Image" },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => { setInputTab(key); setImageResult(null); }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all active:scale-[0.97] ${
                    inputTab === key
                      ? "bg-white text-terra shadow-sm border border-border"
                      : "text-ink-ghost hover:text-ink"
                  }`}
                  style={{ transitionTimingFunction: EASE, transitionDuration: "200ms" }}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          {/* Loading features */}
          {loading && inputTab === "tabular" && (
            <div className="flex items-center gap-3 text-ink-light text-sm py-8">
              <div className="w-4 h-4 border-2 border-terra border-t-transparent rounded-full animate-spin" />
              Loading feature list…
            </div>
          )}

          {/* API error */}
          {apiError && (
            <div className="mb-6 error-box animate-fade-up">
              {apiError}
            </div>
          )}

          {/* ── Image tab content ── */}
          {inputTab === "image" && supportsImage && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-8 animate-fade-up">
              <div className="card">
                <h2 className="text-sm font-semibold text-ink mb-5">Image Upload</h2>
                <ImageUploadForm disease={disease} onResult={setImageResult} />
              </div>
              {imageResult && (
                <div className="card animate-scale-in">
                  <h2 className="text-sm font-semibold text-ink mb-5">Prediction Result</h2>
                  <GradCamOverlay result={imageResult} disease={disease} />
                </div>
              )}
            </div>
          )}

          {/* Feature Form (tabular tab only) */}
          {inputTab === "tabular" && !loading && features.length > 0 && (
            <form onSubmit={handleSubmit} noValidate>
              <div className="card mb-5 sm:mb-6 animate-fade-up" style={{ animationDelay: "100ms" }}>
                <h2 className="text-sm font-semibold text-ink mb-5">Patient Data</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
                  {features.map((f) => (
                    <FeatureInput
                      key={f}
                      name={f}
                      value={values[f]}
                      onChange={handleChange}
                      error={errors[f]}
                    />
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-terra text-white text-sm font-semibold
                  hover:bg-terra-dark transition-all disabled:opacity-50 disabled:cursor-not-allowed
                  shadow-sm shadow-terra/20 hover:shadow-md hover:shadow-terra/25 active:scale-[0.97]"
                style={{ transitionTimingFunction: EASE, transitionDuration: "200ms" }}
              >
                {submitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Running models…
                  </>
                ) : (
                  <>
                    Run Prediction
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </>
                )}
              </button>
            </form>
          )}

          {/* Results */}
          {result && (
            <section id="results-section" className="mt-8 sm:mt-10 animate-fade-up">
              <div className="flex items-center gap-3 mb-6">
                <div className="flex-1 h-px bg-border" />
                <p className="text-xs font-mono text-ink-ghost uppercase tracking-widest shrink-0">
                  Prediction Results
                </p>
                <div className="flex-1 h-px bg-border" />
              </div>

              {/* Ensemble badge */}
              <div className="flex justify-center mb-8 animate-scale-in">
                <EnsembleBadge
                  riskLevel={result.ensemble_risk_level}
                  probability={result.ensemble_probability}
                />
              </div>

              {/* 3 model cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 mb-6">
                {result.models.map((m, idx) => (
                  <div key={m.model_key} className="animate-fade-up" style={{ animationDelay: `${idx * 50}ms` }}>
                    <ModelResultCard result={m} />
                  </div>
                ))}
              </div>

              {/* Saved notice */}
              {result.prediction_id ? (
                <p className="text-xs text-ink-ghost text-center">
                  Saved to your history —{" "}
                  <button
                    onClick={() => navigate("/history")}
                    className="text-terra hover:text-terra-dark transition-colors"
                  >
                    view history
                  </button>
                </p>
              ) : (
                <p className="text-xs text-ink-ghost text-center">
                  Log in and consent to data storage to save this result.
                </p>
              )}

              {/* Disclaimer */}
              <p className="mt-6 text-xs text-ink-ghost leading-relaxed text-center max-w-lg mx-auto">
                Educational tool only. This is not a medical diagnosis.
                Consult a qualified healthcare professional for any health concerns.
              </p>

              {/* Run again */}
              <div className="flex justify-center mt-6">
                <button
                  onClick={() => {
                    setResult(null);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className="text-sm text-terra hover:text-terra-dark transition-all active:scale-[0.97] flex items-center gap-1"
                  style={{ transitionTimingFunction: EASE }}
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
                  Edit values & run again
                </button>
              </div>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
