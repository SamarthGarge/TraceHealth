import React from "react";

/**
 * ShapChart — horizontal bar chart showing SHAP feature attributions.
 * Features that increase risk are shown in --status-high (red),
 * features that decrease risk in --status-low (sage green).
 */

export default function ShapChart({ features = [] }) {
  if (!features.length) {
    return (
      <p className="text-xs text-ink-ghost italic">No SHAP data available.</p>
    );
  }

  // Find max |shap_value| for proportional bar widths
  const maxAbs = Math.max(...features.map((f) => Math.abs(f.shap_value)), 0.001);

  return (
    <div className="space-y-2.5">
      {features.map((f, i) => {
        const pct = Math.round((Math.abs(f.shap_value) / maxAbs) * 100);
        const isRisk = f.direction === "increases_risk";
        const color = isRisk ? "var(--status-high)" : "var(--status-low)";
        const bgColor = isRisk ? "var(--status-high-dim)" : "var(--status-low-dim)";

        return (
          <div key={i} className="flex items-center gap-3">
            {/* Feature name + value */}
            <div className="w-40 shrink-0">
              <p className="text-xs font-medium text-ink truncate">{f.feature}</p>
              <p className="text-[10px] font-mono text-ink-ghost">{f.value}</p>
            </div>

            {/* Bar */}
            <div className="flex-1 rounded-full overflow-hidden" style={{ height: 8, backgroundColor: "var(--border-soft)" }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${pct}%`, backgroundColor: color }}
              />
            </div>

            {/* SHAP value */}
            <span
              className="w-14 text-right text-[10px] font-mono font-medium shrink-0"
              style={{ color }}
            >
              {f.shap_value > 0 ? "+" : ""}{f.shap_value.toFixed(3)}
            </span>
          </div>
        );
      })}

      {/* Legend */}
      <div className="flex gap-4 mt-1 pt-2 border-t border-border-soft">
        <span className="flex items-center gap-1.5 text-[10px] text-ink-ghost">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: "var(--status-high)" }} />
          Increases risk
        </span>
        <span className="flex items-center gap-1.5 text-[10px] text-ink-ghost">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: "var(--status-low)" }} />
          Decreases risk
        </span>
      </div>
    </div>
  );
}
