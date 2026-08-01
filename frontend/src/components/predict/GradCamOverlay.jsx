/**
 * GradCamOverlay.jsx — Grad-CAM heatmap overlay display for image predictions.
 *
 * Props:
 *   result: object from /api/predict/{disease}/image response
 *   disease: "tb" | "cancer"
 */

import React, { useState, useRef } from "react";

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

const RISK_HEX = {
  High:     "#C0392B",
  Moderate: "#E67E22",
  Low:      "#27AE60",
};

const DISEASE_LABELS = {
  tb:     "Tuberculosis",
  cancer: "Lung Cancer",
};

export default function GradCamOverlay({ result, disease }) {
  const [showOverlay, setShowOverlay] = useState(true);
  const [imgError,    setImgError]    = useState(false);
  const [saving,      setSaving]      = useState(false);
  const imgRef = useRef(null);

  if (!result) return null;

  const {
    prediction_label,
    confidence,
    risk_level,
    gradcam_url,
    all_classes = [],
  } = result;

  const riskClass  = RISK_COLORS[risk_level] || "text-ink-mid bg-parchment border-border";
  const dotClass   = RISK_DOT[risk_level]    || "bg-ink-ghost";
  const gradcamSrc = gradcam_url
    ? (gradcam_url.startsWith("/api") ? gradcam_url : `/api${gradcam_url}`)
    : null;

  // -- Save Image -------------------------------------------------------------

  async function handleSaveImage() {
    if (!gradcamSrc) return;
    setSaving(true);
    try {
      const resp = await fetch(gradcamSrc, { credentials: "include" });
      if (!resp.ok) throw new Error("Failed to fetch heatmap");
      const blob = await resp.blob();
      const bitmapUrl = URL.createObjectURL(blob);

      const img = new Image();
      img.crossOrigin = "anonymous";
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = bitmapUrl;
      });

      const PADDING  = 20;
      const FOOTER_H = 130;
      const canvas   = document.createElement("canvas");
      canvas.width   = img.width;
      canvas.height  = img.height + FOOTER_H;

      const ctx = canvas.getContext("2d");

      // Dark background
      ctx.fillStyle = "#1A1A1A";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Heatmap
      ctx.drawImage(img, 0, 0);

      // Footer panel
      ctx.fillStyle = "#111111";
      ctx.fillRect(0, img.height, canvas.width, FOOTER_H);

      // Risk accent bar
      const riskHex = RISK_HEX[risk_level] || "#888888";
      ctx.fillStyle = riskHex;
      ctx.fillRect(0, img.height, 6, FOOTER_H);

      // Risk level
      ctx.fillStyle = riskHex;
      ctx.font = "bold 14px sans-serif";
      ctx.fillText(`${risk_level} Risk`, PADDING + 10, img.height + 26);

      // Prediction label
      ctx.fillStyle = "#FFFFFF";
      ctx.font = "bold 19px serif";
      ctx.fillText(prediction_label, PADDING + 10, img.height + 50);

      // Sub-label
      ctx.fillStyle = "#AAAAAA";
      ctx.font = "12px sans-serif";
      ctx.fillText(
        `${DISEASE_LABELS[disease] ?? disease}  ·  ${(confidence * 100).toFixed(1)}% confidence`,
        PADDING + 10,
        img.height + 68,
      );

      // Class probability bars
      if (all_classes.length > 0) {
        const BAR_X      = PADDING + 10;
        const BAR_Y0     = img.height + 82;
        const LABEL_W    = 85;
        const BAR_AREA_W = canvas.width - PADDING * 2 - 20 - LABEL_W - 45;

        all_classes.forEach((c, i) => {
          const y = BAR_Y0 + i * 17;
          ctx.fillStyle = "#777777";
          ctx.font = "10px sans-serif";
          ctx.fillText(c.label, BAR_X, y + 5);
          ctx.fillStyle = "#2A2A2A";
          ctx.beginPath();
          ctx.roundRect(BAR_X + LABEL_W, y, BAR_AREA_W, 5, 2);
          ctx.fill();
          ctx.fillStyle = riskHex;
          ctx.beginPath();
          ctx.roundRect(BAR_X + LABEL_W, y, BAR_AREA_W * c.prob, 5, 2);
          ctx.fill();
          ctx.fillStyle = "#666666";
          ctx.font = "10px monospace";
          ctx.fillText(`${(c.prob * 100).toFixed(1)}%`, BAR_X + LABEL_W + BAR_AREA_W + 4, y + 5);
        });
      }

      // Disclaimer
      ctx.fillStyle = "#444444";
      ctx.font = "9px sans-serif";
      ctx.fillText(
        "AI screening only — not a clinical diagnosis.  TraceHealth",
        PADDING + 10,
        img.height + FOOTER_H - 8,
      );

      // Trigger download
      canvas.toBlob((outBlob) => {
        const url = URL.createObjectURL(outBlob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `tracehealth_${disease}_analysis.png`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        URL.revokeObjectURL(bitmapUrl);
      }, "image/png");
    } catch (err) {
      console.error("Save image failed:", err);
    } finally {
      setSaving(false);
    }
  }

  // -- Render -----------------------------------------------------------------

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
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowOverlay((v) => !v)}
                className="text-xs text-terra hover:underline"
              >
                {showOverlay ? "Hide" : "Show"} heatmap
              </button>

              {/* Save Image */}
              <button
                onClick={handleSaveImage}
                disabled={saving}
                className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg
                  bg-terra text-white hover:bg-terra-dark transition-colors
                  disabled:opacity-60 disabled:cursor-not-allowed"
                title="Download heatmap with analysis overlay as PNG"
              >
                {saving ? (
                  <>
                    <span className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Save Image
                  </>
                )}
              </button>
            </div>
          </div>

          {showOverlay && (
            <div className="rounded-2xl overflow-hidden border border-border bg-black">
              <img
                ref={imgRef}
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
        This is an AI-assisted screening result, not a clinical diagnosis.
        Consult a qualified healthcare professional before acting on this result.
      </p>
    </div>
  );
}
