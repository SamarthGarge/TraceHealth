import React, { useState } from "react";
import Sidebar from "../components/layout/Sidebar";
import { exportAllPredictions } from "../api/export";

// ── Constants ─────────────────────────────────────────────────────────────────

const DISEASE_OPTIONS = [
  { value: "",         label: "All diseases" },
  { value: "diabetes", label: "Diabetes" },
  { value: "heart",    label: "Heart Disease" },
  { value: "tb",       label: "Tuberculosis" },
  { value: "cancer",   label: "Lung Cancer" },
];

const FORMAT_OPTIONS = [
  {
    value: "csv",
    label: "CSV",
    description: "Spreadsheet-compatible — opens in Excel, Google Sheets, or Numbers.",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  {
    value: "json",
    label: "JSON",
    description: "Full structured data including SHAP values and all model results.",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
      </svg>
    ),
  },
];

// ── Main Component ────────────────────────────────────────────────────────────

export default function Export() {
  const [format, setFormat]   = useState("csv");
  const [disease, setDisease] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [success, setSuccess] = useState("");

  async function handleExport() {
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      await exportAllPredictions({ format, disease: disease || undefined });
      setSuccess(`Downloaded predictions as ${format.toUpperCase()}.`);
      setTimeout(() => setSuccess(""), 4000);
    } catch (err) {
      const msg = err?.response?.data?.detail ?? "Export failed. Please try again.";
      setError(typeof msg === "string" ? msg : JSON.stringify(msg));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen bg-parchment">
      <Sidebar />

      <main className="flex-1 p-8 max-w-3xl">
        {/* Header */}
        <header className="mb-8">
          <p className="text-xs font-mono tracking-widest text-ink-ghost uppercase mb-2">
            Data Portability
          </p>
          <h1 className="font-serif text-3xl text-ink mb-2">Export Data</h1>
          <p className="text-ink-light text-sm">
            Download your prediction history in your preferred format. Your data belongs to you.
          </p>
        </header>

        {/* Format selector */}
        <div className="mb-6">
          <p className="text-xs font-semibold text-ink-mid mb-3">Export format</p>
          <div className="grid grid-cols-2 gap-3">
            {FORMAT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setFormat(opt.value)}
                className={`flex flex-col items-start gap-2 p-4 rounded-xl border text-left transition-all
                  ${format === opt.value
                    ? "border-terra bg-terra-dim"
                    : "border-border bg-white hover:border-border-strong"
                  }`}
              >
                <span style={{ color: format === opt.value ? "var(--terra)" : "var(--ink-ghost)" }}>
                  {opt.icon}
                </span>
                <div>
                  <p className={`text-sm font-semibold ${format === opt.value ? "text-terra" : "text-ink"}`}>
                    {opt.label}
                  </p>
                  <p className="text-xs text-ink-ghost mt-0.5 leading-relaxed">{opt.description}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Disease filter */}
        <div className="mb-8">
          <label className="text-xs font-semibold text-ink-mid block mb-2">
            Filter by disease
          </label>
          <select
            value={disease}
            onChange={(e) => setDisease(e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg border border-border bg-white text-sm text-ink
              focus:outline-none focus:ring-2 focus:ring-terra focus:border-transparent transition"
          >
            {DISEASE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        {/* What's included */}
        <div className="bg-white border border-border rounded-xl p-5 mb-6">
          <p className="text-xs font-semibold text-ink-mid mb-3">What's included</p>
          <ul className="space-y-2">
            {[
              "Prediction date and disease type",
              "All input feature values",
              "Ensemble probability and risk level",
              format === "json"
                ? "Full per-model results (LR, RF, XGBoost) with SHAP values"
                : "Per-model probability and risk level (LR, RF, XGBoost)",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2 text-xs text-ink-mid">
                <svg className="w-3.5 h-3.5 text-status-low mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                {item}
              </li>
            ))}
          </ul>

          {format === "csv" && (
            <p className="mt-3 text-[10px] text-ink-ghost">
              Note: CSV flattens nested data. SHAP values are not included in CSV exports.
              Use JSON for the full dataset.
            </p>
          )}
        </div>

        {/* Error / success */}
        {error && (
          <div className="mb-4 p-4 rounded-lg border border-status-high bg-status-high-dim text-status-high text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 p-4 rounded-lg border border-status-low bg-status-low-dim text-status-low text-sm flex items-center gap-2">
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            {success}
          </div>
        )}

        {/* Download button */}
        <button
          onClick={handleExport}
          disabled={loading}
          className="flex items-center gap-2 px-6 py-3 rounded-lg bg-terra text-white text-sm font-semibold
            hover:bg-terra-dark transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Preparing download…
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download {disease ? DISEASE_OPTIONS.find(o => o.value === disease)?.label : "All"} as {format.toUpperCase()}
            </>
          )}
        </button>

        {/* Privacy note */}
        <p className="mt-6 text-xs text-ink-ghost leading-relaxed max-w-lg">
          Your data is exported directly from your account and is not shared with any third party.
          Only predictions saved with your consent are included.
        </p>
      </main>
    </div>
  );
}
