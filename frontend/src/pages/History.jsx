import React, { useEffect, useState, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Sidebar from "../components/layout/Sidebar";
import { getHistory, deleteHistoryItem } from "../api/predictions";

const DISEASE_LABELS = {
  diabetes: "Diabetes",
  heart:    "Heart Disease",
  tb:       "Tuberculosis",
  cancer:   "Lung Cancer",
};

const RISK_COLOR = {
  Low:      "var(--status-low)",
  Moderate: "var(--status-moderate)",
  High:     "var(--status-high)",
};

const RISK_BG = {
  Low:      "var(--status-low-dim)",
  Moderate: "var(--status-moderate-dim)",
  High:     "var(--status-high-dim)",
};

const DISEASE_DOT = {
  diabetes: "var(--chart-clay)",
  heart:    "var(--chart-plum)",
  tb:       "var(--chart-slate)",
  cancer:   "var(--chart-gold)",
};

const PAGE_SIZE = 20;

export default function History() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const diseaseFilter = searchParams.get("disease") || "";
  const [items, setItems]       = useState([]);
  const [total, setTotal]       = useState(0);
  const [skip, setSkip]         = useState(0);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");
  const [deleting, setDeleting] = useState(null); // id being deleted

  const load = useCallback(async (skipVal = 0, disease = diseaseFilter) => {
    setLoading(true);
    setError("");
    try {
      const data = await getHistory({ skip: skipVal, limit: PAGE_SIZE, disease: disease || undefined });
      setItems(data.items);
      setTotal(data.total);
      setSkip(skipVal);
    } catch {
      setError("Failed to load history. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [diseaseFilter]);

  useEffect(() => { load(0, diseaseFilter); }, [diseaseFilter]);

  async function handleDelete(id) {
    if (!window.confirm("Delete this prediction? This cannot be undone.")) return;
    setDeleting(id);
    try {
      await deleteHistoryItem(id);
      setItems((prev) => prev.filter((i) => i.id !== id));
      setTotal((t) => t - 1);
    } catch {
      setError("Failed to delete. Please try again.");
    } finally {
      setDeleting(null);
    }
  }

  function handleFilterChange(d) {
    setSearchParams(d ? { disease: d } : {});
  }

  const hasPrev = skip > 0;
  const hasNext = skip + PAGE_SIZE < total;

  return (
    <div className="flex min-h-screen bg-parchment">
      <Sidebar />

      <main className="flex-1 p-8">
        <header className="mb-8">
          <p className="text-xs font-mono tracking-widest text-ink-ghost uppercase mb-2">
            My Records
          </p>
          <h1 className="font-serif text-3xl text-ink mb-2">Prediction History</h1>
          <p className="text-ink-light text-sm">
            Your saved screening results.{" "}
            {total > 0 && <span className="text-ink-mid font-medium">{total} total</span>}
          </p>
        </header>

        {/* Filter bar */}
        <div className="flex items-center gap-2 mb-6 flex-wrap">
          {["", "diabetes", "heart", "tb", "cancer"].map((d) => (
            <button
              key={d}
              onClick={() => handleFilterChange(d)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border
                ${diseaseFilter === d
                  ? "bg-terra text-white border-terra"
                  : "bg-white text-ink-mid border-border hover:border-terra hover:text-terra"
                }`}
            >
              {d ? DISEASE_LABELS[d] : "All"}
            </button>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 rounded-lg border border-status-high bg-status-high-dim text-status-high text-sm">
            {error}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex items-center gap-3 text-ink-light text-sm py-8">
            <div className="w-4 h-4 border-2 border-terra border-t-transparent rounded-full animate-spin" />
            Loading history…
          </div>
        )}

        {/* Empty state */}
        {!loading && items.length === 0 && !error && (
          <div className="text-center py-16">
            <div className="w-12 h-12 rounded-xl bg-parchment-lo border border-border flex items-center justify-center mx-auto mb-4">
              <svg className="w-5 h-5 text-ink-ghost" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-ink-mid font-medium mb-1">No predictions yet</p>
            <p className="text-sm text-ink-ghost mb-4">
              Run a screening to see your results here.
            </p>
            <button
              onClick={() => navigate("/predict")}
              className="px-5 py-2.5 rounded-lg bg-terra text-white text-sm font-semibold hover:bg-terra-dark transition-colors"
            >
              Start a prediction
            </button>
          </div>
        )}

        {/* List */}
        {!loading && items.length > 0 && (
          <>
            <div className="space-y-3">
              {items.map((item) => {
                const riskColor = RISK_COLOR[item.ensemble_risk_level] ?? RISK_COLOR.Moderate;
                const riskBg    = RISK_BG[item.ensemble_risk_level]    ?? RISK_BG.Moderate;
                const dot       = DISEASE_DOT[item.disease]             ?? "var(--ink-ghost)";
                const pct       = Math.round((item.ensemble_probability ?? 0) * 100);
                const date      = item.created_at
                  ? new Date(item.created_at).toLocaleDateString("en-IN", {
                      day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"
                    })
                  : "—";

                return (
                  <div
                    key={item.id}
                    className="bg-white border border-border rounded-xl p-5 flex items-center gap-5 hover:border-border-strong transition-colors"
                  >
                    {/* Disease dot */}
                    <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: dot }} />

                    {/* Disease + date */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-ink">
                        {DISEASE_LABELS[item.disease] ?? item.disease}
                      </p>
                      <p className="text-xs text-ink-ghost mt-0.5">{date}</p>
                    </div>

                    {/* Probability */}
                    <div className="text-right shrink-0">
                      <p className="text-lg font-mono font-semibold" style={{ color: riskColor }}>
                        {pct}%
                      </p>
                      <span
                        className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                        style={{ color: riskColor, backgroundColor: riskBg }}
                      >
                        {item.ensemble_risk_level}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => navigate(`/history/${item.id}`)}
                        className="text-xs text-terra hover:text-terra-dark underline transition-colors"
                      >
                        Detail
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        disabled={deleting === item.id}
                        className="p-1.5 rounded-lg text-ink-ghost hover:text-status-high hover:bg-status-high-dim transition-colors disabled:opacity-40"
                        title="Delete"
                      >
                        {deleting === item.id ? (
                          <div className="w-3.5 h-3.5 border border-current border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            {(hasPrev || hasNext) && (
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-border">
                <button
                  disabled={!hasPrev}
                  onClick={() => load(skip - PAGE_SIZE)}
                  className="px-4 py-2 rounded-lg text-sm border border-border text-ink-mid hover:border-border-strong transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  ← Previous
                </button>
                <span className="text-xs text-ink-ghost font-mono">
                  {skip + 1}–{Math.min(skip + PAGE_SIZE, total)} of {total}
                </span>
                <button
                  disabled={!hasNext}
                  onClick={() => load(skip + PAGE_SIZE)}
                  className="px-4 py-2 rounded-lg text-sm border border-border text-ink-mid hover:border-border-strong transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
