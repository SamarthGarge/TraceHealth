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
const MAX_COMPARE = 3;

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

// ── Compare Panel ─────────────────────────────────────────────────────────────

function ComparePanel({ items, onClose }) {
  const MODEL_LABELS = { lr: "Logistic Reg.", rf: "Random Forest", xgb: "XGBoost" };

  // Collect every model key present across items
  const allModelKeys = [...new Set(
    items.flatMap((it) => Object.keys(it.predictions ?? {}))
  )].sort();

  // Collect top-3 SHAP features per item (if present)
  function topShap(item) {
    const shap = item.shap_values;
    if (!shap || typeof shap !== "object") return [];
    return Object.entries(shap)
      .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
      .slice(0, 3);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in" style={{ background: "rgba(28,21,16,0.45)", backdropFilter: "blur(4px)" }}>
      <div className="bg-parchment rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto border border-border animate-scale-in">
        {/* Header */}
        <div className="sticky top-0 bg-parchment border-b border-border px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <div>
            <p className="text-xs font-mono tracking-widest text-ink-ghost uppercase mb-0.5">Analysis</p>
            <h2 className="font-serif text-xl text-ink">Compare Runs</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-ink-ghost hover:text-ink hover:bg-border-soft transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-6">

          {/* Overview table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 pr-4 text-xs font-mono text-ink-ghost uppercase tracking-wider font-normal">Metric</th>
                  {items.map((it, i) => (
                    <th key={it.id} className="text-left py-2 px-3 min-w-[140px]">
                      <span
                        className="w-2 h-2 rounded-full inline-block mr-1.5 align-middle"
                        style={{ backgroundColor: DISEASE_DOT[it.disease] ?? "var(--ink-ghost)" }}
                      />
                      <span className="text-xs font-semibold text-ink">
                        {DISEASE_LABELS[it.disease] ?? it.disease}
                      </span>
                      <br />
                      <span className="text-[10px] text-ink-ghost font-mono font-normal">
                        {new Date(it.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {/* Ensemble risk */}
                <tr>
                  <td className="py-2.5 pr-4 text-xs text-ink-ghost font-mono uppercase tracking-wide">Risk Level</td>
                  {items.map((it) => {
                    const col = RISK_COLOR[it.ensemble_risk_level] ?? RISK_COLOR.Moderate;
                    const bg  = RISK_BG[it.ensemble_risk_level]    ?? RISK_BG.Moderate;
                    return (
                      <td key={it.id} className="py-2.5 px-3">
                        <span
                          className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold"
                          style={{ color: col, backgroundColor: bg }}
                        >
                          {it.ensemble_risk_level ?? "—"}
                        </span>
                      </td>
                    );
                  })}
                </tr>

                {/* Ensemble probability */}
                <tr>
                  <td className="py-2.5 pr-4 text-xs text-ink-ghost font-mono uppercase tracking-wide">Probability</td>
                  {items.map((it) => {
                    const pct = Math.round((it.ensemble_probability ?? 0) * 100);
                    const col = RISK_COLOR[it.ensemble_risk_level] ?? RISK_COLOR.Moderate;
                    return (
                      <td key={it.id} className="py-2.5 px-3">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-semibold text-sm" style={{ color: col }}>{pct}%</span>
                          <div className="flex-1 h-1.5 bg-border rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{ width: `${pct}%`, backgroundColor: col }}
                            />
                          </div>
                        </div>
                      </td>
                    );
                  })}
                </tr>

                {/* Per-model probabilities */}
                {allModelKeys.map((mKey) => (
                  <tr key={mKey}>
                    <td className="py-2.5 pr-4 text-xs text-ink-ghost font-mono uppercase tracking-wide">
                      {MODEL_LABELS[mKey] ?? mKey}
                    </td>
                    {items.map((it) => {
                      const pred = it.predictions?.[mKey];
                      if (!pred) return <td key={it.id} className="py-2.5 px-3 text-xs text-ink-ghost">—</td>;
                      const pct = Math.round((pred.probability ?? 0) * 100);
                      return (
                        <td key={it.id} className="py-2.5 px-3">
                          <span className="text-sm font-mono text-ink-mid">{pct}%</span>
                          <span
                            className="ml-1.5 px-1.5 py-0.5 rounded text-[9px] font-semibold"
                            style={{
                              color: RISK_COLOR[pred.risk_level] ?? RISK_COLOR.Moderate,
                              backgroundColor: RISK_BG[pred.risk_level] ?? RISK_BG.Moderate,
                            }}
                          >
                            {pred.risk_level}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Visual probability comparison bars */}
          <div>
            <p className="text-xs font-mono tracking-widest text-ink-ghost uppercase mb-3">
              Ensemble Probability — Side by Side
            </p>
            <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${items.length}, 1fr)` }}>
              {items.map((it) => {
                const pct = Math.round((it.ensemble_probability ?? 0) * 100);
                const col = RISK_COLOR[it.ensemble_risk_level] ?? RISK_COLOR.Moderate;
                const bg  = RISK_BG[it.ensemble_risk_level]    ?? RISK_BG.Moderate;
                return (
                  <div key={it.id} className="bg-white border border-border rounded-xl p-4 text-center">
                    <p className="text-xs font-semibold text-ink mb-1">
                      {DISEASE_LABELS[it.disease] ?? it.disease}
                    </p>
                    {/* Vertical bar */}
                    <div className="flex justify-center mb-2">
                      <div className="w-12 rounded-t-lg overflow-hidden" style={{ height: 80, backgroundColor: "var(--parchment-lo)" }}>
                        <div
                          className="w-full rounded-t-lg transition-all"
                          style={{
                            height: `${pct}%`,
                            backgroundColor: col,
                            marginTop: `${100 - pct}%`,
                          }}
                        />
                      </div>
                    </div>
                    <span className="font-mono text-xl font-bold" style={{ color: col }}>{pct}%</span>
                    <br />
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{ color: col, backgroundColor: bg }}>
                      {it.ensemble_risk_level}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Top SHAP features per run (if available) */}
          {items.some((it) => it.shap_values && Object.keys(it.shap_values).length > 0) && (
            <div>
              <p className="text-xs font-mono tracking-widest text-ink-ghost uppercase mb-3">
                Top Contributing Factors (SHAP)
              </p>
              <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${items.length}, 1fr)` }}>
                {items.map((it) => {
                  const shapts = topShap(it);
                  return (
                    <div key={it.id} className="bg-white border border-border rounded-xl p-4">
                      <p className="text-xs font-semibold text-ink mb-2">
                        {DISEASE_LABELS[it.disease] ?? it.disease}
                      </p>
                      {shapts.length === 0 ? (
                        <p className="text-xs text-ink-ghost">Not available</p>
                      ) : (
                        <div className="space-y-2">
                          {shapts.map(([feat, val]) => {
                            const isPos = val >= 0;
                            const barW  = Math.min(Math.abs(val) * 100, 100);
                            return (
                              <div key={feat}>
                                <div className="flex justify-between items-center mb-0.5">
                                  <span className="text-[10px] text-ink-mid truncate max-w-[70%]">{feat}</span>
                                  <span
                                    className="text-[10px] font-mono"
                                    style={{ color: isPos ? "var(--status-high)" : "var(--status-low)" }}
                                  >
                                    {isPos ? "+" : ""}{val.toFixed(3)}
                                  </span>
                                </div>
                                <div className="w-full h-1 bg-border rounded-full overflow-hidden">
                                  <div
                                    className="h-full rounded-full"
                                    style={{
                                      width: `${barW}%`,
                                      backgroundColor: isPos ? "var(--status-high)" : "var(--status-low)",
                                    }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <p className="text-[11px] text-ink-ghost leading-relaxed border-t border-border pt-4">
            ⚠ This comparison is for educational purposes only and does not constitute medical advice. Consult a qualified healthcare professional for medical guidance.
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function History() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const diseaseFilter = searchParams.get("disease") || "";
  const [items, setItems]           = useState([]);
  const [total, setTotal]           = useState(0);
  const [skip, setSkip]             = useState(0);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState("");
  const [deleting, setDeleting]     = useState(null);
  const [selected, setSelected]     = useState(new Set()); // ids for comparison
  const [comparing, setComparing]   = useState(false);     // show compare panel

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

  // Reset selection when filter changes
  useEffect(() => { setSelected(new Set()); }, [diseaseFilter]);

  async function handleDelete(id) {
    if (!window.confirm("Delete this prediction? This cannot be undone.")) return;
    setDeleting(id);
    try {
      await deleteHistoryItem(id);
      setItems((prev) => prev.filter((i) => i.id !== id));
      setTotal((t) => t - 1);
      setSelected((s) => { const ns = new Set(s); ns.delete(id); return ns; });
    } catch {
      setError("Failed to delete. Please try again.");
    } finally {
      setDeleting(null);
    }
  }

  function handleFilterChange(d) {
    setSearchParams(d ? { disease: d } : {});
  }

  function toggleSelect(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else if (next.size < MAX_COMPARE) {
        next.add(id);
      }
      return next;
    });
  }

  const selectedItems = items.filter((it) => selected.has(it.id));
  const hasPrev = skip > 0;
  const hasNext = skip + PAGE_SIZE < total;

  return (
    <div className="page-shell">
      <Sidebar />

      <main className="page-main bg-parchment">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <header className="mb-6 sm:mb-8 animate-fade-up">
          <p className="text-[10px] font-mono tracking-widest text-ink-ghost uppercase mb-2">
            My Records
          </p>
          <h1 className="font-display text-2xl sm:text-3xl font-semibold text-ink mb-2">Prediction History</h1>
          <p className="text-ink-light text-sm">
            Your saved screening results.{" "}
            {total > 0 && <span className="text-ink-mid font-medium">{total} total</span>}
          </p>
        </header>

        {/* Filter bar + Compare CTA */}
        <div className="flex items-center gap-2 mb-5 sm:mb-6 flex-wrap overflow-x-auto scrollbar-hide animate-fade-up" style={{ animationDelay: "50ms" }}>
          {["", "diabetes", "heart", "tb", "cancer"].map((d) => (
            <button
              key={d}
              onClick={() => handleFilterChange(d)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border shrink-0 active:scale-[0.95]
                ${diseaseFilter === d
                  ? "bg-terra text-white border-terra shadow-sm shadow-terra/20"
                  : "bg-white text-ink-mid border-border hover:border-terra hover:text-terra"
                }`}
              style={{ transitionTimingFunction: "cubic-bezier(0.23, 1, 0.32, 1)", transitionDuration: "200ms" }}
            >
              {d ? DISEASE_LABELS[d] : "All"}
            </button>
          ))}

          {/* Compare button — appears once ≥2 items selected */}
          {selected.size >= 2 && (
            <button
              onClick={() => setComparing(true)}
              className="ml-auto flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold
                bg-terra text-white hover:bg-terra-dark transition-all shadow-sm"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 0v10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
              </svg>
              Compare {selected.size} runs
            </button>
          )}

          {/* Selection hint */}
          {items.length >= 2 && selected.size === 0 && (
            <span className="ml-auto text-[10px] text-ink-ghost font-mono italic">
              ☑ Select up to {MAX_COMPARE} runs to compare
            </span>
          )}
          {selected.size === 1 && (
            <span className="ml-auto text-[10px] text-ink-ghost font-mono italic">
              Select {MAX_COMPARE - 1} more to compare
            </span>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 rounded-lg border border-status-high bg-status-high-dim text-status-high text-sm">
            {error}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="space-y-3">
            {[1,2,3,4].map(i => <div key={i} className="skeleton h-16 sm:h-[76px] rounded-xl" />)}
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
            <p className="text-sm text-ink-ghost mb-4">Run a screening to see your results here.</p>
            <button
              onClick={() => navigate("/predict")}
              className="px-5 py-2.5 rounded-xl bg-terra text-white text-sm font-semibold hover:bg-terra-dark transition-all active:scale-[0.97] shadow-sm shadow-terra/20"
              style={{ transitionTimingFunction: "cubic-bezier(0.23, 1, 0.32, 1)" }}
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
                const date      = formatDate(item.created_at);
                const isSelected = selected.has(item.id);
                const isDisabled = !isSelected && selected.size >= MAX_COMPARE;

                return (
                  <div
                    key={item.id}
                    className={`bg-white border rounded-xl p-4 sm:p-5 flex items-center gap-3 sm:gap-5 transition-all animate-fade-up
                      ${isSelected ? "border-terra ring-1 ring-terra/20" : "border-border hover:border-border-strong hover:bg-parchment-lo/30"}`}
                    style={{ transitionTimingFunction: "cubic-bezier(0.23, 1, 0.32, 1)", transitionDuration: "200ms" }}
                  >
                    {/* Checkbox for comparison */}
                    <button
                      onClick={() => toggleSelect(item.id)}
                      disabled={isDisabled}
                      title={isDisabled ? `Max ${MAX_COMPARE} runs selected` : isSelected ? "Deselect" : "Select for comparison"}
                      className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 transition-all
                        ${isSelected
                          ? "bg-terra border-terra text-white"
                          : isDisabled
                            ? "border-border opacity-30 cursor-not-allowed"
                            : "border-border hover:border-terra cursor-pointer"
                        }`}
                    >
                      {isSelected && (
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>

                    {/* Disease dot */}
                    <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full shrink-0 hidden sm:block" style={{ backgroundColor: dot }} />

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
                    <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                      <button
                        onClick={() => navigate(`/history/${item.id}`)}
                        className="text-xs text-terra hover:text-terra-dark transition-all active:scale-[0.95] hidden sm:block"
                        style={{ transitionTimingFunction: "cubic-bezier(0.23, 1, 0.32, 1)" }}
                      >
                        Detail
                      </button>
                      <button
                        onClick={() => navigate(`/history/${item.id}`)}
                        className="p-1.5 rounded-lg text-ink-ghost hover:text-terra hover:bg-terra-dim transition-all sm:hidden"
                        title="View detail"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        disabled={deleting === item.id}
                        className="p-1.5 rounded-lg text-ink-ghost hover:text-status-high hover:bg-status-high-dim transition-all disabled:opacity-40 active:scale-[0.92]"
                        style={{ transitionTimingFunction: "cubic-bezier(0.23, 1, 0.32, 1)" }}
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
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-border-soft">
                <button
                  disabled={!hasPrev}
                  onClick={() => load(skip - PAGE_SIZE)}
                  className="px-4 py-2 rounded-xl text-sm border border-border text-ink-mid hover:border-border-strong transition-all active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ transitionTimingFunction: "cubic-bezier(0.23, 1, 0.32, 1)" }}
                >
                  ← Previous
                </button>
                <span className="text-[10px] sm:text-xs text-ink-ghost font-mono">
                  {skip + 1}–{Math.min(skip + PAGE_SIZE, total)} of {total}
                </span>
                <button
                  disabled={!hasNext}
                  onClick={() => load(skip + PAGE_SIZE)}
                  className="px-4 py-2 rounded-xl text-sm border border-border text-ink-mid hover:border-border-strong transition-all active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ transitionTimingFunction: "cubic-bezier(0.23, 1, 0.32, 1)" }}
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}
        </div>
      </main>

      {/* Compare panel modal */}
      {comparing && selectedItems.length >= 2 && (
        <ComparePanel
          items={selectedItems}
          onClose={() => setComparing(false)}
        />
      )}
    </div>
  );
}
