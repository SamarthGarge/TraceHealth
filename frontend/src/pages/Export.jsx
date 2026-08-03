import React, { useState } from "react";
import Sidebar from "../components/layout/Sidebar";
import { exportAllPredictions } from "../api/export";
import apiClient from "../api/client";

// helper for PDF (different endpoint)
async function exportPdf(disease) {
  const params = {};
  if (disease) params.disease = disease;
  const res = await apiClient.get("/api/export/predictions/pdf", {
    params,
    responseType: "blob",
  });
  const cd = res.headers["content-disposition"] ?? "";
  const match = cd.match(/filename="?([^"]+)"?/);
  const filename = match?.[1] ?? "tracehealth_report.pdf";
  const url = URL.createObjectURL(res.data);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

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
  {
    value: "pdf",
    label: "PDF Report",
    description: "Detailed report with cover page, disease sections, SHAP highlights, and methodology. Shareable with a doctor.",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
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
      if (format === "pdf") {
        await exportPdf(disease || undefined);
        setSuccess("Downloaded PDF report.");
      } else {
        await exportAllPredictions({ format, disease: disease || undefined });
        setSuccess(`Downloaded predictions as ${format.toUpperCase()}.`);
      }
      setTimeout(() => setSuccess(""), 4000);
    } catch (err) {
      const msg = err?.response?.data?.detail ?? "Export failed. Please try again.";
      setError(typeof msg === "string" ? msg : JSON.stringify(msg));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-shell">
      <Sidebar />

      <main className="page-main bg-parchment">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Header */}
        <header className="mb-6 sm:mb-8 animate-fade-up">
          <p className="text-[10px] font-mono tracking-widest text-ink-ghost uppercase mb-2">
            Data Portability
          </p>
          <h1 className="font-display text-2xl sm:text-3xl font-semibold text-ink mb-2">Export Data</h1>
          <p className="text-ink-light text-sm">
            Download your prediction history in your preferred format. Your data belongs to you.
          </p>
        </header>

        {/* Format selector */}
        <div className="mb-5 sm:mb-6 animate-fade-up" style={{ animationDelay: "50ms" }}>
          <p className="text-[11px] font-semibold text-ink-mid mb-3 uppercase tracking-wider font-mono">Export format</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {FORMAT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setFormat(opt.value)}
                className={`flex flex-col items-start gap-2 p-4 rounded-xl border text-left transition-all active:scale-[0.98]
                  ${format === opt.value
                    ? "border-terra bg-terra-dim shadow-sm"
                    : "border-border bg-white hover:border-border-strong"
                  }`}
                style={{ transitionTimingFunction: "cubic-bezier(0.23, 1, 0.32, 1)", transitionDuration: "200ms" }}
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
        <div className="mb-6 sm:mb-8 animate-fade-up" style={{ animationDelay: "100ms" }}>
          <label className="text-[11px] font-semibold text-ink-mid block mb-2 uppercase tracking-wider font-mono">
            Filter by disease
          </label>
          <select
            value={disease}
            onChange={(e) => setDisease(e.target.value)}
            className="input w-full"
          >
            {DISEASE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        {/* What's included */}
        <div className="card mb-5 sm:mb-6 animate-fade-up" style={{ animationDelay: "150ms" }}>
          <p className="text-[11px] font-semibold text-ink-mid mb-3 uppercase tracking-wider font-mono">What's included</p>
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
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-terra text-white text-sm font-semibold
            hover:bg-terra-dark transition-all disabled:opacity-50 disabled:cursor-not-allowed
            shadow-sm shadow-terra/20 hover:shadow-md hover:shadow-terra/25 active:scale-[0.97]"
          style={{ transitionTimingFunction: "cubic-bezier(0.23, 1, 0.32, 1)", transitionDuration: "200ms" }}
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
        </div>
      </main>
    </div>
  );
}
