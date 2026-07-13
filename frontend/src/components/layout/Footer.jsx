import React from "react";

/**
 * Footer — persistent disclaimer footer.
 * DataLens §3: JetBrains Mono 11px, parchment-lo background, ink-ghost text.
 * Appears on all pages below the main content area.
 *
 * The disclaimer text is non-negotiable — medical education tools must show it.
 */
export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="w-full border-t border-border bg-parchment-lo">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-2">
        {/* Disclaimer — left / center */}
        <p className="font-mono text-[11px] text-ink-ghost text-center sm:text-left leading-snug">
          ⚕ EDUCATIONAL TOOL ONLY — NOT A MEDICAL DIAGNOSIS. Consult a qualified
          healthcare professional before making any health-related decisions.
        </p>

        {/* Copyright — right */}
        <p className="font-mono text-[11px] text-ink-ghost shrink-0">
          © {year} TraceHealth
        </p>
      </div>
    </footer>
  );
}
