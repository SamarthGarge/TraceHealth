import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Sidebar from "../components/layout/Sidebar";
import ModelResultCard from "../components/predict/ModelResultCard";
import EnsembleBadge from "../components/predict/EnsembleBadge";
import { getHistoryDetail, deleteHistoryItem } from "../api/predictions";

const DISEASE_LABELS = {
  diabetes: "Diabetes",
  heart:    "Heart Disease",
  tb:       "Tuberculosis",
  cancer:   "Lung Cancer",
};

export default function HistoryDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [detail, setDetail]     = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    setLoading(true);
    getHistoryDetail(id)
      .then(setDetail)
      .catch(() => setError("Prediction not found or you don't have access."))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleDelete() {
    if (!window.confirm("Delete this prediction? This cannot be undone.")) return;
    setDeleting(true);
    try {
      await deleteHistoryItem(id);
      navigate("/history", { replace: true });
    } catch {
      setError("Failed to delete. Please try again.");
      setDeleting(false);
    }
  }

  return (
    <div className="page-shell">
      <Sidebar />

      <main className="page-main bg-parchment">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs font-mono text-ink-ghost mb-4 sm:mb-6 animate-fade-up">
          <button onClick={() => navigate("/history")} className="hover:text-terra transition-colors active:scale-[0.97]" style={{ transitionTimingFunction: "cubic-bezier(0.23, 1, 0.32, 1)" }}>
            History
          </button>
          <span className="text-ink-ghost/40">/</span>
          <span className="text-ink-mid truncate max-w-xs">{id}</span>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center gap-3 text-ink-light text-sm py-8">
            <div className="w-4 h-4 border-2 border-terra border-t-transparent rounded-full animate-spin" />
            Loading prediction…
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="p-4 rounded-lg border border-status-high bg-status-high-dim text-status-high text-sm">
            {error}
          </div>
        )}

        {/* Content */}
        {detail && (
          <div className="max-w-4xl">
            {/* Header */}
            <div className="flex items-start justify-between mb-8">
              <div>
                <p className="text-xs font-mono tracking-widest text-ink-ghost uppercase mb-2">
              Risk Screening Record
                </p>
                <h1 className="font-display text-2xl sm:text-3xl font-semibold text-ink mb-1">
                  {DISEASE_LABELS[detail.disease] ?? detail.disease}
                </h1>
                {detail.created_at && (
                  <p className="text-sm text-ink-ghost">
                    {new Date(detail.created_at).toLocaleString("en-IN", {
                      dateStyle: "long", timeStyle: "short"
                    })}
                  </p>
                )}
              </div>

              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-ink-ghost
                  hover:border-status-high hover:text-status-high hover:bg-status-high-dim
                  transition-all text-sm disabled:opacity-40"
              >
                {deleting ? (
                  <div className="w-4 h-4 border border-current border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                )}
                Delete
              </button>
            </div>

            {/* Ensemble badge */}
            <div className="flex justify-center mb-8">
              <EnsembleBadge
                riskLevel={detail.ensemble_risk_level}
                probability={detail.ensemble_probability}
              />
            </div>

            {/* Model cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              {detail.models?.map((m) => (
                <ModelResultCard key={m.model_key} result={m} />
              ))}
            </div>

            {/* Input features table */}
            {detail.features && Object.keys(detail.features).length > 0 && (
              <div className="bg-white border border-border rounded-xl p-6">
                <h2 className="text-sm font-semibold text-ink mb-4">Input Values</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {Object.entries(detail.features).map(([key, val]) => (
                    <div key={key} className="bg-parchment-lo rounded-lg px-3 py-2">
                      <p className="text-[10px] font-mono text-ink-ghost truncate">{key}</p>
                      <p className="text-sm font-medium text-ink mt-0.5">{val}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Disclaimer */}
            <p className="mt-8 text-xs text-ink-ghost leading-relaxed text-center max-w-lg mx-auto">
              ⚠ Educational tool only. This is not a medical diagnosis.
              Consult a qualified healthcare professional for any health concerns.
            </p>
          </div>
        )}
        </div>
      </main>
    </div>
  );
}
