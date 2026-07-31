import React, { useRef } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Activity,
  HeartPulse,
  Stethoscope,
  Wind,
  ShieldCheck,
  Clock,
  Brain,
  Lock,
  CheckCircle2,
  TrendingUp,
  Layers,
} from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger, useGSAP);

/* ─── Reduced-motion helper ─── */
const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ─── Smooth scroll for anchor links ─── */
function scrollTo(e, id) {
  e.preventDefault();
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
}

/* ═══════════════════════════════════════════════════════════════════════════════
   DATA
   Only hex values needed for dynamic inline styles (per-disease accent colors).
   All static styling uses Tailwind DataLens utility classes.
═══════════════════════════════════════════════════════════════════════════════ */

const diseases = [
  {
    name: "Diabetes",
    icon: Activity,
    hex: "#C25539",
    levelHex: "#4D7A60",
    riskPct: 12.5,
    level: "Low",
    inputs: 8,
    desc: "Evaluates metabolic markers — glucose, insulin sensitivity, BMI, and family predisposition.",
    factors: [
      { label: "Blood Glucose", w: 72 },
      { label: "BMI Index", w: 58 },
      { label: "Family History", w: 41 },
    ],
  },
  {
    name: "Heart Disease",
    icon: HeartPulse,
    hex: "#8B5D6B",
    levelHex: "#B8862E",
    riskPct: 42.1,
    level: "Moderate",
    inputs: 13,
    desc: "Analyses cardiovascular indicators — cholesterol, blood pressure, ECG patterns, and angina.",
    factors: [
      { label: "Cholesterol", w: 81 },
      { label: "Blood Pressure", w: 67 },
      { label: "Resting ECG", w: 53 },
    ],
  },
  {
    name: "Tuberculosis",
    icon: Stethoscope,
    hex: "#5B7C99",
    levelHex: "#4D7A60",
    riskPct: 8.3,
    level: "Low",
    inputs: 9,
    desc: "Screens respiratory symptoms, exposure history, and immune markers for TB probability.",
    factors: [
      { label: "Cough Duration", w: 64 },
      { label: "Exposure Risk", w: 55 },
      { label: "Night Sweats", w: 49 },
    ],
  },
  {
    name: "Lung Cancer",
    icon: Wind,
    hex: "#A68A4E",
    levelHex: "#B23A3A",
    riskPct: 61.7,
    level: "High",
    inputs: 11,
    desc: "Weighs smoking history, occupational exposure, and respiratory symptoms for malignancy risk.",
    factors: [
      { label: "Smoking Index", w: 88 },
      { label: "Breath. Difficulty", w: 70 },
      { label: "Chest Pain", w: 62 },
    ],
  },
];

const steps = [
  {
    num: "01",
    title: "Select a disease module",
    desc: "Choose from Diabetes, Heart Disease, Tuberculosis, or Lung Cancer. Each module has a tailored input form.",
  },
  {
    num: "02",
    title: "Enter your health metrics",
    desc: "Input your vitals and lifestyle indicators. Values are processed in-session — nothing stored without consent.",
  },
  {
    num: "03",
    title: "Compare model predictions",
    desc: "Logistic Regression, Random Forest, and XGBoost each score your risk independently.",
  },
  {
    num: "04",
    title: "Understand the explanation",
    desc: "SHAP waterfall charts break down which factors pushed your score up or down, and by how much.",
  },
];

const shapBars = [
  { label: "Cholesterol", val: +0.41, pos: true },
  { label: "Blood Pressure", val: +0.29, pos: true },
  { label: "Age", val: +0.16, pos: true },
  { label: "Activity", val: -0.19, pos: false },
  { label: "Diet", val: -0.08, pos: false },
];

const trustItems = [
  { icon: ShieldCheck, text: "Explicit consent required before any prediction is saved" },
  { icon: Lock, text: "Passwords hashed server-side — never stored in plaintext" },
  { icon: Clock, text: "Short-lived access tokens with automatic rotation" },
  { icon: CheckCircle2, text: "Permanent deletion — no soft-deletes or hidden retention" },
  { icon: Activity, text: "Per-user data isolation — zero cross-account leakage" },
];

const heroModels = [
  { name: "Logistic Regression", abbr: "LogReg", pct: 38, hex: "#5B7C99" },
  { name: "Random Forest", abbr: "R.Forest", pct: 61, hex: "#8B5D6B", active: true },
  { name: "XGBoost", abbr: "XGB", pct: 57, hex: "#A68A4E" },
];

/* ═══════════════════════════════════════════════════════════════════════════════
   LANDING PAGE
═══════════════════════════════════════════════════════════════════════════════ */
export default function LandingPage() {
  const containerRef = useRef(null);
  const heroRef = useRef(null);

  /* Element refs for hero entrance timeline */
  const heroEyebrow = useRef(null);
  const heroHeadline = useRef(null);
  const heroSub = useRef(null);
  const heroCta = useRef(null);
  const heroCard = useRef(null);
  const heroBlobL = useRef(null);
  const heroBlobR = useRef(null);

  /* ── Hero entrance timeline ───────────────────────────────────────── */
  useGSAP(
    () => {
      if (prefersReducedMotion()) return;

      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
      tl.from(heroEyebrow.current, { y: 20, opacity: 0, duration: 0.6 })
        .from(
          heroHeadline.current,
          { y: 40, opacity: 0, duration: 0.9, ease: "power4.out" },
          "-=0.3"
        )
        .from(heroSub.current, { y: 24, opacity: 0, duration: 0.7 }, "-=0.5")
        .from(heroCta.current, { y: 20, opacity: 0, duration: 0.6 }, "-=0.4")
        .from(
          heroCard.current,
          { x: 60, opacity: 0, duration: 1.0, ease: "power3.out" },
          "-=0.6"
        );

      /* Blob parallax on scroll */
      gsap.to(heroBlobL.current, {
        y: -80,
        scrollTrigger: {
          trigger: heroRef.current,
          start: "top top",
          end: "bottom top",
          scrub: 1.8,
        },
      });
      gsap.to(heroBlobR.current, {
        y: -50,
        scrollTrigger: {
          trigger: heroRef.current,
          start: "top top",
          end: "bottom top",
          scrub: 1.2,
        },
      });
    },
    { scope: heroRef }
  );

  /* ── Scroll-triggered section animations ──────────────────────────── */
  useGSAP(
    () => {
      if (prefersReducedMotion()) return;

      /* Stats fade-stagger */
      gsap.from(".stat-item", {
        y: 30,
        opacity: 0,
        duration: 0.7,
        stagger: 0.12,
        ease: "power3.out",
        immediateRender: false,
        scrollTrigger: { trigger: ".stats-section", start: "top 85%" },
      });

      /* Section headings slide up */
      gsap.utils.toArray(".section-heading").forEach((el) => {
        gsap.from(el, {
          y: 36,
          opacity: 0,
          duration: 0.8,
          ease: "power3.out",
          immediateRender: false,
          scrollTrigger: { trigger: el, start: "top 88%" },
        });
      });

      /* Disease cards stagger from below */
      gsap.from(".disease-card", {
        y: 40,
        opacity: 0,
        duration: 0.7,
        stagger: 0.12,
        ease: "power3.out",
        immediateRender: false,
        scrollTrigger: { trigger: ".diseases-section", start: "top 80%" },
      });

      /* Risk gauge fills — scaleX for GPU performance */
      gsap.from(".risk-gauge-fill", {
        scaleX: 0,
        duration: 1.0,
        ease: "power3.out",
        stagger: 0.1,
        immediateRender: false,
        scrollTrigger: { trigger: ".diseases-section", start: "top 78%" },
      });

      /* Factor bars — scaleX for GPU performance */
      gsap.from(".factor-bar", {
        scaleX: 0,
        duration: 0.7,
        ease: "power2.out",
        stagger: 0.03,
        immediateRender: false,
        scrollTrigger: { trigger: ".diseases-section", start: "top 76%" },
      });

      /* Step connector line — scrub-animated scaleY */
      gsap.set(".step-line", { scaleY: 0, transformOrigin: "top center" });
      gsap.to(".step-line", {
        scaleY: 1,
        ease: "none",
        scrollTrigger: {
          trigger: ".steps-section",
          start: "top 70%",
          end: "bottom 60%",
          scrub: 0.8,
        },
      });

      /* Steps stagger from left */
      gsap.from(".step-item", {
        x: -36,
        opacity: 0,
        duration: 0.7,
        stagger: 0.15,
        ease: "power3.out",
        immediateRender: false,
        scrollTrigger: { trigger: ".steps-section", start: "top 80%" },
      });

      /* Bento cells stagger from below */
      gsap.from(".bento-cell", {
        y: 44,
        opacity: 0,
        duration: 0.8,
        stagger: 0.1,
        ease: "power3.out",
        immediateRender: false,
        scrollTrigger: { trigger: ".features-section", start: "top 80%" },
      });

      /* SHAP bars — scaleX */
      gsap.from(".shap-bar-fill", {
        scaleX: 0,
        duration: 0.8,
        stagger: 0.08,
        ease: "power3.out",
        immediateRender: false,
        scrollTrigger: { trigger: ".features-section", start: "top 74%" },
      });

      /* Sparkline path draw */
      gsap.from(".spark-path", {
        strokeDashoffset: 300,
        duration: 1.2,
        ease: "power2.out",
        immediateRender: false,
        scrollTrigger: { trigger: ".features-section", start: "top 74%" },
      });

      /* Trust items slide from right */
      gsap.from(".trust-item", {
        x: 28,
        opacity: 0,
        duration: 0.6,
        stagger: 0.08,
        ease: "power2.out",
        immediateRender: false,
        scrollTrigger: { trigger: ".trust-section", start: "top 82%" },
      });

      /* CTA scale up */
      gsap.from(".cta-inner", {
        scale: 0.96,
        opacity: 0,
        duration: 0.9,
        ease: "power3.out",
        immediateRender: false,
        scrollTrigger: { trigger: ".cta-section", start: "top 85%" },
      });
    },
    { scope: containerRef }
  );

  /* ═══════════════════════════════════════════════════════════════════════
     RENDER
  ═══════════════════════════════════════════════════════════════════════ */
  return (
    <div
      ref={containerRef}
      className="min-h-screen overflow-x-hidden bg-parchment text-ink font-body"
    >
      {/* ══════════════════════ NAVBAR ══════════════════════ */}
      <header className="sticky top-0 z-40 w-full backdrop-blur-md bg-parchment/85 border-b border-border">
        <div className="mx-auto max-w-7xl px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <img
              src="/new_logo.svg"
              alt="TraceHealth logo"
              className="h-10 w-10 rounded-xl object-contain"
            />
            <span className="font-display text-3xl font-semibold bg-gradient-to-r from-[#141314] via-[#733B24] to-[#C95A2D] text-transparent bg-clip-text tracking-tight">
              TraceHealth
            </span>
          </div>

          {/* Desktop nav links */}
          <nav className="hidden md:flex gap-8 items-center">
            {[
              { label: "How it works", id: "how-it-works" },
              { label: "Diseases", id: "diseases" },
              { label: "Features", id: "features" },
            ].map(({ label, id }) => (
              <a
                key={label}
                href={`#${id}`}
                onClick={(e) => scrollTo(e, id)}
                className="text-sm font-medium text-ink-mid hover:text-ink transition-colors duration-base"
              >
                {label}
              </a>
            ))}
          </nav>

          {/* Auth buttons */}
          <div className="flex items-center gap-3">
            <Link to="/login">
              <button className="text-sm font-medium px-4 py-2 rounded-lg text-ink-mid hover:text-ink transition-colors duration-base">
                Log in
              </button>
            </Link>
            <Link to="/signup">
              <button className="hidden sm:inline-flex text-sm font-semibold px-5 py-2.5 rounded-lg bg-terra text-white hover:bg-terra-dark transition-colors duration-base">
                Start Free Assessment
              </button>
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* ══════════════════════ HERO ══════════════════════ */}
        <section ref={heroRef} className="relative pt-20 pb-28 px-6 overflow-hidden">
          {/* Ambient blobs */}
          <div
            ref={heroBlobL}
            className="pointer-events-none absolute -top-40 -left-40 w-[560px] h-[560px] rounded-full blur-[110px] opacity-[0.12] bg-terra"
          />
          <div
            ref={heroBlobR}
            className="pointer-events-none absolute -bottom-48 -right-48 w-[520px] h-[520px] rounded-full blur-[130px] opacity-[0.08]"
            style={{ background: "#5B7C99" }}
          />

          <div className="relative mx-auto max-w-7xl grid lg:grid-cols-[1.1fr_0.9fr] gap-16 items-center">
            {/* Left column — text */}
            <div className="space-y-7">
              {/* Eyebrow #1 (of max 2) */}
              <div
                ref={heroEyebrow}
                className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-mono uppercase tracking-widest border border-border bg-white text-ink-light"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-status-low animate-pulse" />
                Explainable Health Screening
              </div>

              <h1
                ref={heroHeadline}
                className="font-display font-semibold leading-[1.08] tracking-tight"
                style={{ fontSize: "clamp(2.8rem, 6vw, 4.8rem)" }}
              >
                Trace your health risks
                <br className="hidden md:block" />
                <span className="text-terra"> with absolute clarity.</span>
              </h1>

              <p
                ref={heroSub}
                className="text-lg md:text-xl max-w-lg leading-relaxed text-ink-mid"
              >
                Screen four conditions with three ML models simultaneously.
                Every prediction includes SHAP explanations — so you know{" "}
                <em className="font-display italic">why</em>.
              </p>

              <div
                ref={heroCta}
                className="flex flex-wrap items-center gap-4 pt-1"
              >
                <Link to="/signup">
                  <button className="inline-flex items-center gap-2.5 px-8 py-3.5 rounded-xl text-base font-semibold bg-terra text-white shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]">
                    Start Free Assessment
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </Link>
                <Link to="/login">
                  <button className="px-6 py-3.5 rounded-xl text-base font-medium border border-border text-ink-mid hover:text-ink hover:border-border-strong transition-colors duration-base">
                    Log in
                  </button>
                </Link>
              </div>
            </div>

            {/* Right column — mini prediction card preview */}
            <div ref={heroCard} className="hidden lg:block">
              <div className="rounded-2xl bg-white border border-border shadow-xl overflow-hidden">
                {/* Accent gradient bar */}
                <div
                  className="h-1"
                  style={{
                    background:
                      "linear-gradient(to right, #C25539, #8B5D6B, #A68A4E)",
                  }}
                />
                <div className="p-7">
                  <div className="font-mono text-[10px] uppercase tracking-widest text-ink-ghost mb-1">
                    Prediction Analysis
                  </div>
                  <h3 className="font-display text-xl font-medium text-ink mb-5">
                    Heart Disease Risk
                  </h3>

                  {/* Model tabs */}
                  <div className="flex gap-1 p-1 rounded-lg bg-parchment-lo mb-6">
                    {heroModels.map((m) => (
                      <button
                        key={m.name}
                        className="flex-1 py-1.5 rounded-md text-[11px] font-mono font-medium transition-all duration-fast"
                        style={{
                          background: m.active ? "#fff" : "transparent",
                          color: m.active ? m.hex : "#8A7D74",
                          boxShadow: m.active
                            ? "0 1px 3px rgba(0,0,0,0.08)"
                            : "none",
                        }}
                      >
                        {m.abbr}
                      </button>
                    ))}
                  </div>

                  {/* Model bars */}
                  <div className="space-y-3.5">
                    {heroModels.map((m) => (
                      <div key={m.name}>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs font-medium text-ink">
                            {m.name}
                          </span>
                          <span
                            className="font-mono text-xs font-semibold"
                            style={{ color: m.hex }}
                          >
                            {m.pct}%
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-parchment-lo overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-slow"
                            style={{
                              width: `${m.pct}%`,
                              background: m.active ? m.hex : `${m.hex}80`,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Risk annotation */}
                  <div
                    className="mt-5 flex items-start gap-2.5 rounded-lg p-3 text-xs bg-status-moderate-dim"
                    style={{ border: "1px solid rgba(184,134,46,0.15)" }}
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-status-moderate mt-1 shrink-0" />
                    <span className="text-status-moderate leading-relaxed">
                      Random Forest scores{" "}
                      <strong className="font-semibold">High Risk</strong> (61%)
                      — above the 60% threshold.
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ══════════════════════ STATS RIBBON ══════════════════════ */}
        <section className="stats-section py-12 bg-white border-y border-border">
          <div className="mx-auto max-w-5xl px-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {[
                { value: "4", suffix: "", label: "Disease modules" },
                { value: "3", suffix: "", label: "ML models per run" },
                { value: "100", suffix: "%", label: "SHAP-explainable" },
                { value: "0", suffix: "", label: "Data stored w/o consent" },
              ].map((s, i) => (
                <div key={i} className="stat-item text-center">
                  <div
                    className="font-display italic font-medium leading-none mb-2 text-terra"
                    style={{
                      fontSize: "clamp(2.2rem, 4.5vw, 3.2rem)",
                    }}
                  >
                    {s.value}
                    <span className="text-[0.6em]">{s.suffix}</span>
                  </div>
                  <div className="font-mono text-[11px] uppercase tracking-widest text-ink-light">
                    {s.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════════════════ DISEASE MODULES ══════════════════════ */}
        <section
          id="diseases"
          className="diseases-section py-24 px-6 bg-parchment"
        >
          <div className="mx-auto max-w-7xl">
            <h2
              className="section-heading font-display font-semibold leading-tight mb-12"
              style={{ fontSize: "clamp(2rem, 4vw, 3rem)" }}
            >
              Four conditions.{" "}
              <span className="text-ink-mid">Comprehensive screening.</span>
            </h2>

            {/* Horizontal scroll-snap container */}
            <div
              className="flex gap-5 overflow-x-auto snap-x snap-mandatory pb-4 -mx-6 px-6 scrollbar-hide"
              style={{ scrollbarWidth: "none" }}
            >
              {diseases.map((d) => {
                const Icon = d.icon;
                return (
                  <div
                    key={d.name}
                    className="disease-card shrink-0 w-[300px] md:w-[320px] snap-start rounded-2xl bg-white border border-border overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all duration-slow cursor-default"
                  >
                    {/* Accent top bar */}
                    <div className="h-1" style={{ background: d.hex }} />

                    <div className="p-6">
                      {/* Icon + Name + Level */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center"
                            style={{ background: `${d.hex}15` }}
                          >
                            <Icon
                              className="w-5 h-5"
                              style={{ color: d.hex }}
                            />
                          </div>
                          <div>
                            <h3 className="font-display text-lg font-semibold leading-tight text-ink">
                              {d.name}
                            </h3>
                            <span className="font-mono text-[10px] text-ink-light">
                              {d.inputs} inputs
                            </span>
                          </div>
                        </div>
                        <span
                          className="rounded-full px-2.5 py-0.5 text-[10px] font-mono font-semibold shrink-0"
                          style={{
                            background: `${d.levelHex}15`,
                            color: d.levelHex,
                          }}
                        >
                          {d.level}
                        </span>
                      </div>

                      {/* Description */}
                      <p className="text-sm leading-relaxed text-ink-mid mb-5">
                        {d.desc}
                      </p>

                      {/* Risk gauge */}
                      <div className="mb-5">
                        <div className="flex justify-between items-center mb-1.5">
                          <span className="font-mono text-[10px] uppercase tracking-widest text-ink-ghost">
                            Sample risk
                          </span>
                          <span
                            className="font-mono text-xs font-bold"
                            style={{ color: d.levelHex }}
                          >
                            {d.riskPct}%
                          </span>
                        </div>
                        <div className="relative h-2 rounded-full bg-parchment-lo overflow-hidden">
                          <div
                            className="risk-gauge-fill h-full rounded-full origin-left"
                            style={{
                              width: `${d.riskPct}%`,
                              background: d.levelHex,
                            }}
                          />
                          {/* 60% threshold tick */}
                          <div
                            className="absolute top-0 h-full w-px opacity-60 bg-ink-ghost"
                            style={{ left: "60%" }}
                          />
                        </div>
                      </div>

                      {/* Divider */}
                      <div className="border-t border-border-soft mb-4" />

                      {/* Factor bars */}
                      <div className="space-y-2.5">
                        {d.factors.map((f) => (
                          <div key={f.label}>
                            <div className="flex justify-between mb-0.5">
                              <span className="text-[11px] text-ink-light">
                                {f.label}
                              </span>
                              <span className="font-mono text-[10px] text-ink-ghost">
                                {f.w}%
                              </span>
                            </div>
                            <div className="h-1 rounded-full bg-parchment-lo overflow-hidden">
                              <div
                                className="factor-bar h-full rounded-full origin-left"
                                style={{
                                  width: `${f.w}%`,
                                  background: `${d.hex}50`,
                                }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ══════════════════════ HOW IT WORKS ══════════════════════ */}
        <section
          id="how-it-works"
          className="steps-section py-24 px-6 bg-parchment-lo border-t border-border"
        >
          <div className="mx-auto max-w-5xl">
            <h2
              className="section-heading font-display font-semibold mb-14"
              style={{ fontSize: "clamp(2rem, 4vw, 3rem)" }}
            >
              From data to insight{" "}
              <span className="text-ink-mid">in four steps.</span>
            </h2>

            <div className="relative">
              {/* Connector line */}
              <div
                className="step-line absolute left-[27px] top-8 bottom-8 w-0.5 hidden md:block"
                style={{
                  background:
                    "linear-gradient(to bottom, #C25539, rgba(221,213,201,0.37))",
                }}
              />

              <div className="space-y-0">
                {steps.map((step, i) => (
                  <div
                    key={step.num}
                    className="step-item flex gap-7 items-start relative"
                  >
                    {/* Step circle */}
                    <div
                      className="shrink-0 w-14 h-14 rounded-full flex items-center justify-center z-10 border-2 transition-all"
                      style={{
                        background: i === 0 ? "#C25539" : "#fff",
                        color: i === 0 ? "#fff" : "#C25539",
                        borderColor: i === 0 ? "#C25539" : "#DDD5C9",
                        boxShadow:
                          i === 0
                            ? "0 0 0 6px rgba(194,85,57,0.09)"
                            : "none",
                      }}
                    >
                      <span className="font-mono text-sm font-bold">
                        {step.num}
                      </span>
                    </div>

                    {/* Step content */}
                    <div className="pb-12 pt-2 flex-1">
                      <h3 className="font-display text-xl font-semibold text-ink mb-2">
                        {step.title}
                      </h3>
                      <p className="text-sm leading-relaxed text-ink-mid max-w-lg">
                        {step.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ══════════════════════ BENTO FEATURES ══════════════════════ */}
        <section
          id="features"
          className="features-section py-24 px-6 bg-parchment border-t border-border"
        >
          <div className="mx-auto max-w-6xl">
            {/* Section intro — Eyebrow #2 (of max 2) */}
            <div className="mb-14">
              <p className="font-mono text-xs uppercase tracking-widest text-terra mb-3">
                Built different
              </p>
              <h2
                className="section-heading font-display font-semibold"
                style={{ fontSize: "clamp(2rem, 4vw, 3rem)" }}
              >
                Designed for transparency.
              </h2>
              <p className="mt-3 text-base max-w-xl text-ink-mid leading-relaxed">
                Every design decision traces back to one principle: you should
                always know why the model said what it said.
              </p>
            </div>

            {/* Bento grid — asymmetric */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* ── SHAP Explainability — tall, row-span-2 ── */}
              <div
                className="bento-cell md:row-span-2 rounded-2xl p-7 bg-white border border-border flex flex-col"
                style={{ minHeight: 440 }}
              >
                <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4 bg-terra-dim">
                  <Brain className="w-5 h-5 text-terra" />
                </div>
                <h3 className="font-display text-xl font-semibold text-ink mb-2">
                  SHAP Explainability
                </h3>
                <p className="text-sm leading-relaxed text-ink-mid mb-6">
                  Every prediction comes with a waterfall chart showing which
                  factors pushed your score up or down.
                </p>

                {/* Mini SHAP waterfall */}
                <div className="flex-1 rounded-xl p-4 bg-parchment-hi border border-border">
                  <div className="font-mono text-[10px] uppercase tracking-widest text-ink-ghost mb-3">
                    Feature attribution — Heart Disease
                  </div>
                  <div className="space-y-2.5">
                    {shapBars.map((b) => (
                      <div key={b.label}>
                        <div className="flex justify-between mb-0.5">
                          <span className="text-[11px] font-medium text-ink-mid">
                            {b.label}
                          </span>
                          <span
                            className="font-mono text-[11px]"
                            style={{
                              color: b.pos ? "#B23A3A" : "#4D7A60",
                            }}
                          >
                            {b.pos ? "+" : ""}
                            {b.val.toFixed(2)}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {/* Negative bar (grows right-to-left) */}
                          {!b.pos && (
                            <div className="flex-1 flex justify-end">
                              <div
                                className="shap-bar-fill h-1.5 rounded-full origin-right"
                                style={{
                                  width: `${Math.abs(b.val) * 170}px`,
                                  maxWidth: "100%",
                                  background: "#4D7A60",
                                  opacity: 0.65,
                                }}
                              />
                            </div>
                          )}
                          {/* Center axis */}
                          <div className="w-px h-3.5 shrink-0 bg-border" />
                          {/* Positive bar (grows left-to-right) */}
                          {b.pos && (
                            <div className="flex-1">
                              <div
                                className="shap-bar-fill h-1.5 rounded-full origin-left"
                                style={{
                                  width: `${Math.abs(b.val) * 170}px`,
                                  maxWidth: "100%",
                                  background: "#B23A3A",
                                  opacity: 0.7,
                                }}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between mt-3">
                    <span className="font-mono text-[9px] text-status-low">
                      ← Decreases risk
                    </span>
                    <span className="font-mono text-[9px] text-status-high">
                      Increases risk →
                    </span>
                  </div>
                </div>
              </div>

              {/* ── Multi-Model Comparison — wide ── */}
              <div className="bento-cell md:col-span-2 rounded-2xl p-7 bg-white border border-border">
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center mb-4"
                  style={{ background: "#8B5D6B15" }}
                >
                  <Layers className="w-5 h-5" style={{ color: "#8B5D6B" }} />
                </div>
                <h3 className="font-display text-xl font-semibold text-ink mb-2">
                  Multi-Model Comparison
                </h3>
                <p className="text-sm leading-relaxed text-ink-mid mb-5">
                  Three algorithms run simultaneously. Disagreements near the
                  threshold are the most informative moments.
                </p>
                <div className="space-y-2.5">
                  {[
                    { name: "Logistic Regression", pct: 38, hex: "#5B7C99" },
                    { name: "Random Forest", pct: 61, hex: "#8B5D6B" },
                    { name: "XGBoost", pct: 57, hex: "#A68A4E" },
                  ].map((m) => (
                    <div key={m.name} className="flex items-center gap-3">
                      <span className="text-[11px] font-mono w-32 shrink-0 text-ink-light">
                        {m.name}
                      </span>
                      <div className="flex-1 h-1.5 rounded-full bg-parchment-lo overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${m.pct}%`,
                            background: m.hex,
                          }}
                        />
                      </div>
                      <span
                        className="font-mono text-xs font-semibold w-8 text-right shrink-0"
                        style={{ color: m.hex }}
                      >
                        {m.pct}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── Personal Risk History — wide ── */}
              <div className="bento-cell md:col-span-2 rounded-2xl p-7 bg-white border border-border">
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center mb-4"
                  style={{ background: "#A68A4E15" }}
                >
                  <TrendingUp
                    className="w-5 h-5"
                    style={{ color: "#A68A4E" }}
                  />
                </div>
                <h3 className="font-display text-xl font-semibold text-ink mb-2">
                  Personal Risk History
                </h3>
                <p className="text-sm leading-relaxed text-ink-mid mb-5">
                  Every saved prediction builds your risk timeline. See how your
                  score moves as your inputs change.
                </p>
                <div className="rounded-xl px-4 py-3 bg-parchment-hi border border-border">
                  <div className="font-mono text-[10px] uppercase tracking-widest text-ink-ghost mb-2">
                    Diabetes risk — last 6 months
                  </div>
                  <svg
                    viewBox="0 0 260 64"
                    className="w-full"
                    style={{ height: 56 }}
                    aria-label="Sparkline showing diabetes risk trend declining over 6 months"
                  >
                    <path
                      className="spark-path"
                      d="M0,48 L44,42 L88,36 L132,30 L176,24 L220,18 L260,14"
                      fill="none"
                      stroke="#4D7A60"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeDasharray="300"
                      strokeDashoffset="0"
                    />
                    {[0, 44, 88, 132, 176, 220, 260].map((x, i) => {
                      const ys = [48, 42, 36, 30, 24, 18, 14];
                      return (
                        <circle
                          key={x}
                          cx={x}
                          cy={ys[i]}
                          r="3"
                          fill="#4D7A60"
                          opacity="0.6"
                        />
                      );
                    })}
                  </svg>
                  <div className="flex justify-between">
                    <span className="font-mono text-[9px] text-ink-ghost">
                      Jan
                    </span>
                    <span className="font-mono text-[9px] text-ink-ghost">
                      Jun
                    </span>
                  </div>
                </div>
              </div>

              {/* ── Private by Design — full-width dark ── */}
              <div className="bento-cell md:col-span-3 rounded-2xl p-7 bg-ink">
                <div className="flex flex-col md:flex-row md:items-center gap-7">
                  <div className="flex-1">
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center mb-4"
                      style={{ background: "rgba(255,255,255,0.08)" }}
                    >
                      <Lock className="w-5 h-5 text-parchment" />
                    </div>
                    <h3 className="font-display text-xl font-semibold text-parchment-hi mb-2">
                      Private by Design
                    </h3>
                    <p className="text-sm leading-relaxed text-ink-ghost">
                      Nothing is stored without explicit consent. Delete
                      individual records or your entire account — permanently.
                    </p>
                  </div>
                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {[
                      "Explicit consent before saving",
                      "Passwords hashed, never plaintext",
                      "Short-lived access tokens",
                      "Permanent deletion, no soft-deletes",
                    ].map((item) => (
                      <div
                        key={item}
                        className="flex items-center gap-2.5 rounded-lg px-3.5 py-2.5"
                        style={{
                          background: "rgba(255,255,255,0.05)",
                          border: "1px solid rgba(255,255,255,0.08)",
                        }}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-status-low" />
                        <span className="text-xs text-ink-ghost">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ══════════════════════ TRUST ══════════════════════ */}
        <section className="trust-section py-24 px-6 bg-parchment-lo border-t border-border">
          <div className="mx-auto max-w-5xl">
            <div className="grid lg:grid-cols-2 gap-14 items-start">
              {/* Left — headline */}
              <div>
                <h2
                  className="section-heading font-display font-semibold mb-5"
                  style={{ fontSize: "clamp(2rem, 4vw, 3rem)" }}
                >
                  Private by design.{" "}
                  <span className="text-ink-mid">
                    Transparent by default.
                  </span>
                </h2>
                <p className="text-base leading-relaxed text-ink-mid mb-5">
                  The data layer assumes everything you enter is personal —
                  because it is. No health data is stored without explicit,
                  logged consent.
                </p>
                <p className="text-base leading-relaxed text-ink-mid">
                  Delete individual predictions, all history, or your entire
                  account. Deletion is permanent and immediate.
                </p>
              </div>

              {/* Right — trust items */}
              <div className="space-y-2.5">
                {trustItems.map(({ icon: Icon, text }, i) => (
                  <div
                    key={i}
                    className="trust-item flex items-center gap-3.5 rounded-xl px-5 py-3.5 bg-white border border-border"
                  >
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: "rgba(77,122,96,0.08)" }}
                    >
                      <Icon className="w-4 h-4 text-status-low" />
                    </div>
                    <span className="text-sm text-ink-mid">{text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ══════════════════════ CTA ══════════════════════ */}
        <section className="cta-section py-32 px-6 relative overflow-hidden bg-ink">
          {/* Ambient blobs */}
          <div className="pointer-events-none absolute -top-24 -right-24 w-[400px] h-[400px] rounded-full blur-[100px] opacity-[0.15] bg-terra" />
          <div
            className="pointer-events-none absolute -bottom-24 -left-24 w-[300px] h-[300px] rounded-full blur-[100px] opacity-[0.10]"
            style={{ background: "#5B7C99" }}
          />

          <div className="cta-inner relative mx-auto max-w-2xl text-center">
            <h2
              className="font-display font-semibold mb-5 leading-tight text-parchment-hi"
              style={{ fontSize: "clamp(2rem, 5vw, 3.2rem)" }}
            >
              Start your risk assessment today.
            </h2>
            <p className="text-base mb-9 leading-relaxed text-ink-ghost">
              No credit card required. Create an account, run your first
              prediction, and see exactly why the model scored you the way it
              did.
            </p>
            <Link to="/signup">
              <button
                className="inline-flex items-center gap-2.5 px-9 py-4 rounded-xl text-base font-semibold bg-terra text-white hover:opacity-90 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300 group"
                style={{
                  boxShadow: "0 8px 32px rgba(194,85,57,0.35)",
                }}
              >
                Start Free Assessment
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-base" />
              </button>
            </Link>
            <p className="mt-5 font-mono text-[11px] text-ink-ghost/50">
              Educational tool only — not a medical diagnosis.
            </p>
          </div>
        </section>
      </main>

      {/* ══════════════════════ FOOTER ══════════════════════ */}
      <footer className="py-8 px-6 border-t border-border bg-parchment">
        <div className="mx-auto max-w-6xl flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <img
              src="/new_logo.svg"
              alt="TraceHealth logo"
              className="h-9 w-9 rounded-xl object-contain"
            />
            <span className="font-display text-xl font-medium bg-gradient-to-r from-[#141314] via-[#733B24] to-[#C95A2D] text-transparent bg-clip-text">
              TraceHealth
            </span>
          </div>
          <p className="font-mono text-[11px] text-center text-ink-light">
            Educational tool only — not a medical diagnosis.
          </p>
          <div className="flex items-center gap-4">
            <p className="font-mono text-[11px] text-ink-ghost">
              © {new Date().getFullYear()} TraceHealth
            </p>
            <Link
              to="/admin/login"
              className="font-mono text-[11px] text-ink-ghost hover:text-terra transition-colors"
            >
              Admin
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
