import React, { useState } from "react";
import ShapChart from "./ShapChart";

/**
 * ModelResultCard — shows the result from a single model (LR, RF, or XGB).
 * Expandable SHAP section is hidden by default.
 */

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

// Model series colors matching chart legend (chart-plum=XGB, chart-slate=LR, chart-gold=RF)
const MODEL_COLOR = {
  lr:  "var(--chart-slate)",
  rf:  "var(--chart-gold)",
  xgb: "var(--chart-plum)",
};

export default function ModelResultCard({ result }) {
  const [shapOpen, setShapOpen] = useState(false);
  const { model_key, model_name, probability, risk_level, shap_top } = result;
  const pct = Math.round(probability * 100);
  const riskColor = RISK_COLOR[risk_level] ?? RISK_COLOR.Moderate;
  const riskBg   = RISK_BG[risk_level]    ?? RISK_BG.Moderate;
  const modelColor = MODEL_COLOR[model_key] ?? "var(--ink-mid)";

  return (
    <div className="bg-white border border-border rounded-xl overflow-hidden">
      {/* Colored top stripe by model */}
      <div className="h-1" style={{ backgroundColor: modelColor }} />

      <div className="p-5">
        {/* Header row */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs font-mono text-ink-ghost uppercase tracking-widest mb-0.5">{model_key.toUpperCase()}</p>
            <p className="text-sm font-semibold text-ink">{model_name}</p>
          </div>

          {/* Risk badge */}
          <span
            className="px-3 py-1 rounded-full text-xs font-semibold"
            style={{ color: riskColor, backgroundColor: riskBg }}
          >
            {risk_level}
          </span>
        </div>

        {/* Probability bar */}
        <div className="mb-1 flex items-center justify-between">
          <span className="text-xs text-ink-light">Probability</span>
          <span className="text-sm font-mono font-semibold" style={{ color: riskColor }}>{pct}%</span>
        </div>
        <div className="w-full rounded-full overflow-hidden" style={{ height: 6, backgroundColor: "var(--border-soft)" }}>
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${pct}%`, backgroundColor: riskColor }}
          />
        </div>

        {/* SHAP toggle */}
        {shap_top?.length > 0 && (
          <div className="mt-4">
            <button
              onClick={() => setShapOpen((o) => !o)}
              className="flex items-center gap-1.5 text-xs text-terra hover:text-terra-dark transition-colors font-medium"
            >
              <svg
                className={`w-3.5 h-3.5 transition-transform ${shapOpen ? "rotate-90" : ""}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
              {shapOpen ? "Hide" : "Show"} feature impact
            </button>

            {shapOpen && (
              <div className="mt-3 pt-3 border-t border-border-soft">
                <ShapChart features={shap_top} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
