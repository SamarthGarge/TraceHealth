import React from "react";
import { useNavigate } from "react-router-dom";

/**
 * DiseaseCard — clickable card on the Predict landing page.
 * Navigates to /predict/:id when clicked.
 */

const DISEASE_META = {
  diabetes: {
    label: "Diabetes",
    dot: "var(--chart-clay)",
    description: "Assess risk based on glucose, BMI, age, and metabolic markers.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="w-7 h-7" stroke="currentColor" strokeWidth={1.6}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-3-3v6M12 3C7.029 3 3 7.029 3 12s4.029 9 9 9 9-4.029 9-9-4.029-9-9-9z" />
      </svg>
    ),
  },
  heart: {
    label: "Heart Disease",
    dot: "var(--chart-plum)",
    description: "Evaluate cardiovascular risk from ECG, cholesterol, and clinical data.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="w-7 h-7" stroke="currentColor" strokeWidth={1.6}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
      </svg>
    ),
  },
  tb: {
    label: "Tuberculosis",
    dot: "var(--chart-slate)",
    description: "Screen for TB risk using symptom-based clinical indicators.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="w-7 h-7" stroke="currentColor" strokeWidth={1.6}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      </svg>
    ),
  },
  cancer: {
    label: "Lung Cancer",
    dot: "var(--chart-gold)",
    description: "Estimate lung cancer likelihood from lifestyle and symptom factors.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="w-7 h-7" stroke="currentColor" strokeWidth={1.6}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
  },
};

export default function DiseaseCard({ diseaseKey }) {
  const navigate = useNavigate();
  const meta = DISEASE_META[diseaseKey];
  if (!meta) return null;

  return (
    <button
      onClick={() => navigate(`/predict/${diseaseKey}`)}
      className="group w-full text-left bg-white border border-border rounded-xl p-6 hover:border-terra hover:shadow-card transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-terra"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <span
          className="w-12 h-12 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: `color-mix(in srgb, ${meta.dot} 12%, white)`, color: meta.dot }}
        >
          {meta.icon}
        </span>
        <svg
          className="w-4 h-4 text-ink-ghost group-hover:text-terra transition-colors mt-1"
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </div>

      {/* Dot + label */}
      <div className="flex items-center gap-2 mb-1.5">
        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: meta.dot }} />
        <span className="font-semibold text-ink text-base">{meta.label}</span>
      </div>

      <p className="text-sm text-ink-light leading-relaxed">{meta.description}</p>

      <div className="mt-4 text-xs font-mono text-ink-ghost group-hover:text-terra transition-colors">
        Run 3 models →
      </div>
    </button>
  );
}

export { DISEASE_META };
