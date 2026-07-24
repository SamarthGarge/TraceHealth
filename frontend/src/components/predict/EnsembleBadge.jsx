import React from "react";

/**
 * EnsembleBadge — displays the ensemble risk level with the DataLens
 * status color system (Low=sage, Moderate=amber, High=red).
 */

const RISK_META = {
  Low:      { color: "var(--status-low)",      bg: "var(--status-low-dim)",      label: "Low Risk" },
  Moderate: { color: "var(--status-moderate)", bg: "var(--status-moderate-dim)", label: "Moderate Risk" },
  High:     { color: "var(--status-high)",     bg: "var(--status-high-dim)",     label: "High Risk" },
};

export default function EnsembleBadge({ riskLevel, probability, size = "lg" }) {
  const meta = RISK_META[riskLevel] ?? RISK_META.Low;
  const pct = Math.round((probability ?? 0) * 100);

  return (
    <div
      className={`inline-flex flex-col items-center rounded-2xl border ${size === "lg" ? "px-8 py-6" : "px-5 py-4"}`}
      style={{ borderColor: meta.color, backgroundColor: meta.bg }}
    >
      {/* Big probability number */}
      <span
        className={`font-serif font-semibold leading-none ${size === "lg" ? "text-5xl" : "text-3xl"}`}
        style={{ color: meta.color }}
      >
        {pct}%
      </span>

      {/* Risk label */}
      <span
        className={`mt-2 font-semibold tracking-wide uppercase ${size === "lg" ? "text-sm" : "text-xs"}`}
        style={{ color: meta.color }}
      >
        {meta.label}
      </span>

      {/* Progress arc (simple bar) */}
      <div className="mt-3 w-full bg-white/60 rounded-full overflow-hidden" style={{ height: 4 }}>
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, backgroundColor: meta.color }}
        />
      </div>

      <p className="mt-2 text-xs text-ink-light">Ensemble of 3 models</p>
    </div>
  );
}
