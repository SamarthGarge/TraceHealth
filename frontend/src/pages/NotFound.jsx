import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

/**
 * 404 page — editorial design with large display number.
 * Responsive: centers on all breakpoints.
 */
export default function NotFound() {
  return (
    <div className="min-h-screen bg-parchment flex items-center justify-center px-6">
      <div className="text-center max-w-md animate-fade-up">
        {/* Large display number */}
        <div className="font-display text-[8rem] sm:text-[10rem] font-semibold leading-none text-border-strong select-none mb-2">
          404
        </div>

        <h1 className="font-display text-2xl sm:text-3xl font-semibold text-ink mb-3">
          Page not found
        </h1>
        <p className="text-ink-mid text-sm leading-relaxed mb-8 max-w-xs mx-auto">
          The page you're looking for doesn't exist or has been moved.
          Let's get you back on track.
        </p>

        <Link
          to="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-terra text-white text-sm font-medium hover:bg-terra-dark shadow-sm shadow-terra/20 hover:shadow-md hover:shadow-terra/25 transition-all active:scale-[0.97]"
          style={{ transitionTimingFunction: "cubic-bezier(0.23, 1, 0.32, 1)" }}
        >
          <ArrowLeft className="w-4 h-4" />
          Back to home
        </Link>

        <p className="mt-12 font-mono text-[10px] text-ink-ghost tracking-wider uppercase">
          TraceHealth — Explainable Health Screening
        </p>
      </div>
    </div>
  );
}
