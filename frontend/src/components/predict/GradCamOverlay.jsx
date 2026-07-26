/**
 * GradCamOverlay.jsx — Grad-CAM heatmap overlay display for image predictions.
 *
 * Props:
 *   result: object from /api/predict/{disease}/image response
 *   disease: "tb" | "cancer"
 */

import React, { useState } from "react";

const RISK_COLORS = {
  High:     "text-status-high bg-status-high-dim border-status-high",
  Moderate: "text-status-med bg-status-med-dim border-status-med",
  Low:      "text-status-low bg-status-low-dim border-status-low",
};

const RISK_DOT = {
  High:     "bg-status-high",
  Moderate: "bg-status-med",
  Low:      "bg-status-low",
};

const DISEASE_LABELS = {
  tb:     "Tuberculosis",
  cancer: "Lung Cancer",
};

export default function GradCamOverlay({ result, disease }) {
  const [showOverlay, setShowOverlay] = useState(true);
  const [imgError,    setImgError]    = useState(false);

  if (!result) return null;

  const {
    prediction_label,
    confidence,
    risk_level,
    gradcam_url,
    all_classes = [],
  } = result;

  const riskClass = RISK_COLORS[risk_level] || "text-ink-mid bg-parchment border-border";
  const dotClass  = RISK_DOT[risk_level]    || "bg-ink-ghost";
  const gradcamSrc = gradcam_url
    ? (gradcam_url.startsWith("/api") ? gradcam_url : `/api${gradcam_url}`)
    : null;

  return (
    <div className="space-y-6">
      {/* Risk badge + label */}
      <div className="flex items-start gap-4">
        <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-semibold ${riskClass}`}>
          <span className={`w-2 h-2 rounded-full ${dotClass}`} />
          {risk_level} Risk
        </div>
        <div>
          <p className="text-lg font-serif text-ink">{prediction_label}</p>
          <p className="text-xs text-ink-ghost">
            {DISEASE_LABELS[disease] ?? disease} — {(confidence * 100).toFixed(1)}% confidence
          </p>
        </div>
      </div>

      {/* Grad-CAM overlay */}
      {gradcamSrc && !imgError && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-ink-mid uppercase tracking-widest">
              Grad-CAM Explanation
            </p>
            <button
              onClick={() => setShowOverlay((v) => !v)}
              className="text-xs text-terra hover:underline"
            >
              {showOverlay ? "Hide" : "Show"} heatmap
            </button>
          </div>
          {showOverlay && (
            <div className="rounded-2xl overflow-hidden border border-border bg-black">
              <img
                src={gradcamSrc}
                alt="Grad-CAM heatmap overlay"
                className="w-full max-h-72 object-contain"
                onError={() => setImgError(true)}
              />
            </div>
          )}
          <p className="text-[10px] text-ink-ghost mt-2 leading-relaxed">
            Highlighted regions indicate areas the model focused on when making its prediction.
            Red/warm regions have the highest influence on the result.
          </p>
        </div>
      )}

      {/* Class probabilities */}
      {all_classes.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-ink-mid uppercase tracking-widest mb-3">
            Class Probabilities
          </p>
          <div className="space-y-2.5">
            {all_classes.map((c) => (
              <div key={c.label} className="flex items-center gap-3">
                <span className="text-xs text-ink-mid w-28 shrink-0">{c.label}</span>
                <div className="flex-1 h-2 bg-parchment rounded-full overflow-hidden">
                  <div
                    className="h-2 rounded-full bg-terra transition-all duration-700"
                    style={{ width: `${(c.prob * 100).toFixed(1)}%` }}
                  />
                </div>
                <span className="text-xs font-mono text-ink-ghost w-12 text-right">
                  {(c.prob * 100).toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Disclaimer */}
      <p className="text-[10px] text-ink-ghost border-t border-border pt-4 leading-relaxed">
        ⚠ This is an AI-assisted screening result, not a clinical diagnosis.
        Consult a qualified healthcare professional before acting on this result.
      </p>
    </div>
  );
}
