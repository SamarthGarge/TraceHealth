# LandingPage Component

A React landing page for a health risk prediction tool ("HealthRisk Predictor") featuring disease modules, multi-model comparison, SHAP explainability, and GSAP scroll animations.

```jsx
import React, { useEffect, useRef } from "react";
import { Link } from "wouter";
import {
  ArrowRight,
  Activity,
  HeartPulse,
  Stethoscope,
  Wind,
  ShieldCheck,
  Clock,
  BarChart2,
  Brain,
  Lock,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Users,
  FlaskConical,
  BookOpen,
  Layers,
  ChevronDown,
} from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/* ─── Design tokens ─── */
const T = {
  parchment:    "#F4EFE6",
  parchmentLo:  "#EDE7DC",
  parchmentHi:  "#FAF7F2",
  ink:          "#1C1510",
  inkMid:       "#4A3D35",
  inkLight:     "#8A7D74",
  inkGhost:     "#C4B9B0",
  border:       "#DDD5C9",
  terra:        "#C25539",
  terraDark:    "#9E3D26",
  terraDim:     "rgba(194,85,57,0.09)",
  statusLow:    "#4D7A60",
  statusModerate:"#B8862E",
  statusHigh:   "#B23A3A",
  clay:         "#C25539",
  plum:         "#8B5D6B",
  slate:        "#5B7C99",
  gold:         "#A68A4E",
};

/* ─── Data ─── */
const diseases = [
  {
    name: "Diabetes",
    icon: Activity,
    color: T.clay,
    riskPct: 12.5,
    level: "Low",
    levelColor: T.statusLow,
    inputs: 8,
    desc: "Evaluates metabolic markers — blood glucose, insulin sensitivity, BMI, and family predisposition — to estimate your probability of developing Type 2 diabetes.",
    factors: [
      { label: "Blood Glucose", w: 72 },
      { label: "BMI Index",     w: 58 },
      { label: "Family History",w: 41 },
      { label: "Age",           w: 33 },
    ],
    shap: [
      { label: "Glucose",  val: +0.38, pos: true },
      { label: "BMI",      val: +0.22, pos: true },
      { label: "Age",      val: +0.11, pos: true },
      { label: "Exercise", val: -0.14, pos: false },
      { label: "Diet",     val: -0.09, pos: false },
    ],
  },
  {
    name: "Heart Disease",
    icon: HeartPulse,
    color: T.plum,
    riskPct: 42.1,
    level: "Moderate",
    levelColor: T.statusModerate,
    inputs: 13,
    desc: "Analyses cardiovascular indicators — cholesterol ratios, blood pressure, resting ECG patterns, and exercise-induced angina — for coronary artery disease risk.",
    factors: [
      { label: "Cholesterol",   w: 81 },
      { label: "Blood Pressure",w: 67 },
      { label: "Resting ECG",   w: 53 },
      { label: "Max Heart Rate",w: 44 },
    ],
    shap: [
      { label: "Cholesterol",  val: +0.41, pos: true },
      { label: "BP",           val: +0.29, pos: true },
      { label: "ECG",          val: +0.16, pos: true },
      { label: "Activity",     val: -0.19, pos: false },
      { label: "Thalassemia",  val: -0.07, pos: false },
    ],
  },
  {
    name: "Tuberculosis",
    icon: Stethoscope,
    color: T.slate,
    riskPct: 8.3,
    level: "Low",
    levelColor: T.statusLow,
    inputs: 9,
    desc: "Screens respiratory symptoms, exposure history, and immune-system markers to estimate latent or active TB probability across community exposure contexts.",
    factors: [
      { label: "Cough Duration",w: 64 },
      { label: "Night Sweats",  w: 49 },
      { label: "Weight Loss",   w: 38 },
      { label: "Exposure Risk", w: 55 },
    ],
    shap: [
      { label: "Cough dur.",  val: +0.35, pos: true },
      { label: "Exposure",    val: +0.27, pos: true },
      { label: "Fever",       val: +0.13, pos: true },
      { label: "BCG vaccine", val: -0.22, pos: false },
      { label: "Age",         val: -0.06, pos: false },
    ],
  },
  {
    name: "Lung Cancer",
    icon: Wind,
    color: T.gold,
    riskPct: 61.7,
    level: "High",
    levelColor: T.statusHigh,
    inputs: 11,
    desc: "Weighs long-term smoking history, occupational exposure, persistent respiratory symptoms, and genetic markers to assess malignancy probability.",
    factors: [
      { label: "Smoking Index",     w: 88 },
      { label: "Chest Pain",        w: 62 },
      { label: "Breath. Difficulty",w: 70 },
      { label: "Coughing Blood",    w: 55 },
    ],
    shap: [
      { label: "Smoking",     val: +0.52, pos: true },
      { label: "Cough blood", val: +0.31, pos: true },
      { label: "Dyspnea",     val: +0.18, pos: true },
      { label: "Non-smoker",  val: -0.11, pos: false },
      { label: "Young age",   val: -0.08, pos: false },
    ],
  },
];

const steps = [
  {
    num: "01",
    title: "Select a Disease Module",
    desc: "Choose from Diabetes, Heart Disease, Tuberculosis, or Lung Cancer. Each module has a tailored input form built around clinical evidence.",
    tag: "Four modules available",
  },
  {
    num: "02",
    title: "Enter Your Health Metrics",
    desc: "Input your vitals, symptoms, and lifestyle indicators. Values are processed in your session — nothing leaves without your explicit consent.",
    tag: "Session-only by default",
  },
  {
    num: "03",
    title: "Compare Model Predictions",
    desc: "Logistic Regression, Random Forest, and XGBoost each score your risk independently. See where they agree and where the threshold is contested.",
    tag: "Three models simultaneously",
  },
  {
    num: "04",
    title: "Understand the Explanation",
    desc: "SHAP waterfall charts break down exactly which factors pushed your score up or down and by how much — no black boxes, ever.",
    tag: "Per-model SHAP output",
  },
];

const models = [
  { name: "Logistic Regression", abbr: "LogReg", pct: 38, color: T.slate },
  { name: "Random Forest",       abbr: "R.Forest", pct: 61, color: T.plum, selected: true },
  { name: "XGBoost",             abbr: "XGBoost", pct: 57, color: T.gold },
];

/* Bento feature data */
const shapBars = [
  { label: "Cholesterol",   val: +0.41, pos: true },
  { label: "Blood Pressure",val: +0.29, pos: true },
  { label: "Age",           val: +0.16, pos: true },
  { label: "Activity",      val: -0.19, pos: false },
  { label: "Diet",          val: -0.08, pos: false },
];

/* Workflow paths */
const paths = [
  {
    tag: "Personal health",
    icon: Users,
    color: T.clay,
    title: "Monthly check-in",
    subtitle: "Track how your risk shifts as you change habits.",
    steps: [
      "Select a module and enter your latest vitals",
      "Run prediction — all three models score instantly",
      "Compare with last month's saved result",
      "See which SHAP factor moved the most",
    ],
    metric: "Risk trend visible within 2 predictions",
  },
  {
    tag: "ML learning",
    icon: FlaskConical,
    color: T.plum,
    title: "Algorithm dissection",
    subtitle: "Understand what makes models disagree.",
    steps: [
      "Enter a deliberately borderline set of inputs",
      "Observe the spread between LR, RF, and XGBoost",
      "Switch models — watch the SHAP chart rebuild",
      "Note which features each algorithm weights differently",
    ],
    metric: "3 models × SHAP = 3 independent explanations",
  },
  {
    tag: "Clinical study",
    icon: BookOpen,
    color: T.slate,
    title: "Evidence-based reference",
    subtitle: "Cross-reference predictions with lab reports.",
    steps: [
      "Enter patient-profile parameters (anonymised)",
      "Get probability estimates with clinical thresholds",
      "Read factor importance against published literature",
      "Save result and attach your lab PDF as a note",
    ],
    metric: "Per-factor SHAP magnitude included in export",
  },
];

const trustItems = [
  { icon: ShieldCheck, text: "Explicit consent required before any prediction is saved to your account" },
  { icon: Lock,        text: "Passwords hashed server-side — never stored or transmitted in plaintext" },
  { icon: Clock,       text: "Short-lived access tokens, not persisted in localStorage or cookies" },
  { icon: CheckCircle2,text: "Deletion is permanent — no soft-deletes or hidden data retention" },
  { icon: Activity,    text: "Per-user data isolation enforced at the query layer — zero cross-account leakage" },
];

/* ─── Helpers ─── */
function RiskGauge({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="risk-gauge-wrap mt-6 mb-2">
      <div className="flex justify-between items-center mb-2">
        <span className="font-mono text-xs uppercase tracking-widest" style={{ color: T.inkLight }}>
          Sample risk score
        </span>
        <span className="font-mono text-sm font-bold" style={{ color }}>
          {pct}%
        </span>
      </div>
      <div className="relative h-2.5 rounded-full overflow-hidden" style={{ background: T.parchmentLo }}>
        <div
          className="risk-gauge-fill h-full rounded-full"
          style={{ width: `${pct}%`, background: color }}
        />
        {/* threshold tick at 60 */}
        <div
          className="absolute top-0 h-full w-px"
          style={{ left: "60%", background: T.inkGhost, opacity: 0.7 }}
        />
      </div>
      <div className="flex justify-end mt-1">
        <span className="font-mono text-[10px]" style={{ color: T.inkGhost }}>
          60% threshold
        </span>
      </div>
    </div>
  );
}

function FactorBar({
  label, w, color, index,
}: { label: string; w: number; color: string; index: number }) {
  return (
    <div className="factor-bar-row">
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs" style={{ color: T.inkLight }}>{label}</span>
        <span className="font-mono text-[10px]" style={{ color: T.inkGhost }}>{w}%</span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: T.parchmentLo }}>
        <div
          className="factor-bar h-full rounded-full"
          style={{ width: `${w}%`, background: `${color}60` }}
        />
      </div>
    </div>
  );
}

/* ─── Main component ─── */
export default function LandingPage() {
  const heroRef       = useRef<HTMLDivElement>(null);
  const heroBlobL     = useRef<HTMLDivElement>(null);
  const heroBlobR     = useRef<HTMLDivElement>(null);
  const eyebrowRef    = useRef<HTMLDivElement>(null);
  const headlineRef   = useRef<HTMLHeadingElement>(null);
  const subRef        = useRef<HTMLParagraphElement>(null);
  const ctaRef        = useRef<HTMLDivElement>(null);
  const scrollHintRef = useRef<HTMLDivElement>(null);

  /* ── Hero entrance ── */
  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
      tl
        .from(eyebrowRef.current, { y: 24, opacity: 0, duration: 0.65 })
        .from(headlineRef.current, { y: 48, opacity: 0, duration: 1.0, ease: "power4.out" }, "-=0.35")
        .from(subRef.current,      { y: 28, opacity: 0, duration: 0.75 }, "-=0.55")
        .from(ctaRef.current,      { y: 22, opacity: 0, duration: 0.65 }, "-=0.45")
        .from(scrollHintRef.current, { opacity: 0, duration: 0.9 }, "-=0.2");

      /* Blob parallax on scroll */
      gsap.to(heroBlobL.current, {
        y: -80,
        scrollTrigger: { trigger: heroRef.current, start: "top top", end: "bottom top", scrub: 1.8 },
      });
      gsap.to(heroBlobR.current, {
        y: -50,
        scrollTrigger: { trigger: heroRef.current, start: "top top", end: "bottom top", scrub: 1.2 },
      });
    }, heroRef);
    return () => ctx.revert();
  }, []);

  /* ── ScrollTrigger animations ── */
  useEffect(() => {
    const ctx = gsap.context(() => {
      /* ── Stats: fade-stagger ── */
      gsap.from(".stat-item", {
        y: 36, opacity: 0, duration: 0.75, stagger: 0.13, ease: "power3.out",
        immediateRender: false,
        scrollTrigger: { trigger: ".stats-section", start: "top 82%" },
      });

      /* ── Section eyebrow labels clip-reveal ── */
      gsap.utils.toArray<HTMLElement>(".eyebrow-label").forEach((el) => {
        gsap.from(el, {
          clipPath: "inset(0 100% 0 0)",
          opacity: 0,
          duration: 0.6,
          ease: "power2.out",
          immediateRender: false,
          scrollTrigger: { trigger: el, start: "top 90%" },
        });
      });

      /* ── Section headings slide-up ── */
      gsap.utils.toArray<HTMLElement>(".section-heading").forEach((el) => {
        gsap.from(el, {
          y: 44, opacity: 0, duration: 0.9, ease: "power3.out",
          immediateRender: false,
          scrollTrigger: { trigger: el, start: "top 88%" },
        });
      });

      /* ── Disease cards: column-aware stagger ── */
      gsap.from(".disease-card:nth-child(odd)", {
        x: -36, opacity: 0, duration: 0.8, stagger: 0.16, ease: "power3.out",
        immediateRender: false,
        scrollTrigger: { trigger: ".diseases-section", start: "top 80%" },
      });
      gsap.from(".disease-card:nth-child(even)", {
        x: 36, opacity: 0, duration: 0.8, stagger: 0.16, ease: "power3.out",
        immediateRender: false,
        scrollTrigger: { trigger: ".diseases-section", start: "top 80%" },
      });

      /* Risk gauge fills (width from 0) */
      gsap.from(".risk-gauge-fill", {
        width: 0, duration: 1.2, ease: "power3.out", stagger: 0.12,
        immediateRender: false,
        scrollTrigger: { trigger: ".diseases-section", start: "top 78%" },
      });

      /* Factor bars animate */
      gsap.from(".factor-bar", {
        width: 0, duration: 0.8, ease: "power2.out", stagger: 0.04,
        immediateRender: false,
        scrollTrigger: { trigger: ".diseases-section", start: "top 76%" },
      });

      /* ── How it works: scrub step connector line ── */
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

      gsap.from(".step-item", {
        x: -44, opacity: 0, duration: 0.8, stagger: 0.18, ease: "power3.out",
        immediateRender: false,
        scrollTrigger: { trigger: ".steps-section", start: "top 80%" },
      });

      /* ── Model comparison ── */
      gsap.from(".models-text-col", {
        x: -40, opacity: 0, duration: 0.9, ease: "power3.out",
        immediateRender: false,
        scrollTrigger: { trigger: ".models-section", start: "top 80%" },
      });
      gsap.from(".models-panel", {
        x: 40, opacity: 0, duration: 0.9, ease: "power3.out",
        immediateRender: false,
        scrollTrigger: { trigger: ".models-section", start: "top 80%" },
      });
      gsap.from(".model-bar-inner", {
        scaleX: 0, transformOrigin: "left center",
        duration: 1.1, stagger: 0.2, ease: "power3.out",
        immediateRender: false,
        scrollTrigger: { trigger: ".models-section", start: "top 74%" },
      });

      /* ── Bento features ── */
      gsap.from(".bento-shap", {
        y: 50, opacity: 0, duration: 0.95, ease: "power3.out",
        immediateRender: false,
        scrollTrigger: { trigger: ".features-section", start: "top 80%" },
      });
      gsap.from(".bento-multimodel", {
        y: 50, opacity: 0, duration: 0.85, ease: "power3.out",
        immediateRender: false,
        scrollTrigger: { trigger: ".features-section", start: "top 78%", delay: 0.1 },
      });
      gsap.from(".bento-history", {
        y: 50, opacity: 0, duration: 0.85, ease: "power3.out",
        immediateRender: false,
        scrollTrigger: { trigger: ".features-section", start: "top 76%", delay: 0.22 },
      });
      gsap.from(".bento-privacy", {
        y: 40, opacity: 0, duration: 0.85, ease: "power3.out",
        immediateRender: false,
        scrollTrigger: { trigger: ".features-section", start: "top 74%" },
      });

      /* Bento SHAP bars animate left→right */
      gsap.from(".shap-bar-fill", {
        width: 0, duration: 0.9, stagger: 0.1, ease: "power3.out",
        immediateRender: false,
        scrollTrigger: { trigger: ".features-section", start: "top 74%" },
      });

      /* History sparkline path draw */
      gsap.from(".spark-path", {
        strokeDashoffset: 300, duration: 1.4, ease: "power2.out",
        immediateRender: false,
        scrollTrigger: { trigger: ".features-section", start: "top 74%" },
      });

      /* ── Workflow paths ── */
      gsap.from(".path-card", {
        y: 52, opacity: 0, scale: 0.97, duration: 0.85, stagger: 0.16, ease: "power3.out",
        immediateRender: false,
        scrollTrigger: { trigger: ".paths-section", start: "top 80%" },
      });

      /* ── Trust items ── */
      gsap.from(".trust-item", {
        x: 32, opacity: 0, duration: 0.7, stagger: 0.1, ease: "power2.out",
        immediateRender: false,
        scrollTrigger: { trigger: ".trust-section", start: "top 80%" },
      });

      /* ── CTA ── */
      gsap.from(".cta-inner", {
        scale: 0.96, opacity: 0, duration: 0.95, ease: "power3.out",
        immediateRender: false,
        scrollTrigger: { trigger: ".cta-section", start: "top 84%" },
      });
    });
    return () => ctx.revert();
  }, []);

  return (
    <div className="min-h-screen overflow-x-hidden" style={{ background: T.parchment, color: T.ink }}>

      {/* ── Navbar ── */}
      <header
        className="sticky top-0 z-50 w-full backdrop-blur-md"
        style={{ borderBottom: `1px solid ${T.border}`, background: `${T.parchment}d0` }}
      >
        <div className="container mx-auto px-6 h-16 flex items-center justify-between max-w-7xl">
          <div className="flex items-center gap-2.5">
            <Activity className="h-5 w-5" style={{ color: T.terra }} />
            <span className="font-serif text-xl font-semibold" style={{ color: T.ink }}>
              HealthRisk Predictor
            </span>
          </div>
          <nav className="hidden md:flex gap-8 items-center">
            {[
              { label: "How it works", href: "#how-it-works" },
              { label: "Diseases",     href: "#diseases" },
              { label: "Features",     href: "#features" },
            ].map(({ label, href }) => (
              <a key={label} href={href}
                className="text-sm font-medium transition-opacity hover:opacity-60"
                style={{ color: T.inkMid }}
              >
                {label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <button className="text-sm font-medium px-4 py-2 rounded-lg transition-opacity hover:opacity-60"
                style={{ color: T.inkMid }}>
                Log in
              </button>
            </Link>
            <Link href="/signup">
              <button
                className="text-sm font-semibold px-5 py-2.5 rounded-lg transition-all hover:opacity-90"
                style={{ background: T.terra, color: "#fff" }}
              >
                Get Started
              </button>
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* ═══════════════════════════════════════
            HERO
        ═══════════════════════════════════════ */}
        <section ref={heroRef} className="relative pt-28 pb-36 px-6 text-center overflow-hidden">
          <div ref={heroBlobL}
            className="pointer-events-none absolute -top-40 -left-40 w-[560px] h-[560px] rounded-full blur-[110px] opacity-35"
            style={{ background: "rgba(194,85,57,0.12)" }}
          />
          <div ref={heroBlobR}
            className="pointer-events-none absolute -bottom-48 -right-48 w-[520px] h-[520px] rounded-full blur-[130px] opacity-25"
            style={{ background: "rgba(91,124,153,0.15)" }}
          />

          <div className="relative container mx-auto max-w-4xl space-y-8">
            <div ref={eyebrowRef}
              className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-mono uppercase tracking-widest"
              style={{ border: `1px solid ${T.border}`, color: T.inkLight, background: "#fff" }}
            >
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: T.statusLow }} />
              Explainable Health Screening
            </div>

            <h1 ref={headlineRef}
              className="font-serif font-semibold leading-[1.08] tracking-tight"
              style={{ fontSize: "clamp(3rem,7vw,5.5rem)", color: T.ink }}
            >
              Understand your health risks.
              <br className="hidden md:block" />
              <em className="not-italic" style={{ color: T.terra }}>With absolute clarity.</em>
            </h1>

            <p ref={subRef}
              className="text-lg md:text-xl max-w-2xl mx-auto leading-relaxed"
              style={{ color: T.inkMid }}
            >
              Screen four major conditions with three ML models simultaneously.
              Every prediction includes SHAP explanations — so you always know <em>why</em>.
            </p>

            <div ref={ctaRef} className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
              <Link href="/signup">
                <button
                  className="inline-flex items-center gap-2.5 px-9 py-4 rounded-xl text-base font-semibold shadow-lg transition-all hover:opacity-90 hover:shadow-xl hover:-translate-y-0.5"
                  style={{ background: T.terra, color: "#fff" }}
                >
                  Get Started — it's free
                  <ArrowRight className="w-4 h-4" />
                </button>
              </Link>
              <Link href="/login">
                <button
                  className="px-9 py-4 rounded-xl text-base font-medium transition-all hover:opacity-70"
                  style={{ border: `1.5px solid ${T.border}`, color: T.inkMid, background: "transparent" }}
                >
                  Log in
                </button>
              </Link>
            </div>

            <div ref={scrollHintRef} className="flex flex-col items-center gap-1.5 pt-8 opacity-40">
              <span className="text-xs font-mono tracking-widest uppercase" style={{ color: T.inkLight }}>
                Scroll to explore
              </span>
              <ChevronDown className="w-4 h-4 animate-bounce" style={{ color: T.inkLight }} />
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════
            STATS BAR
        ═══════════════════════════════════════ */}
        <section
          className="stats-section py-14"
          style={{ background: "#fff", borderTop: `1px solid ${T.border}`, borderBottom: `1px solid ${T.border}` }}
        >
          <div className="container mx-auto px-6 max-w-5xl">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {[
                { value: "4",    suffix: "",  label: "Disease Modules" },
                { value: "3",    suffix: "",  label: "ML Models per run" },
                { value: "100",  suffix: "%", label: "SHAP-explainable" },
                { value: "0",    suffix: "",  label: "Data stored w/o consent" },
              ].map((s, i) => (
                <div key={i} className="stat-item text-center">
                  <div
                    className="font-serif italic font-medium leading-none mb-2"
                    style={{ fontSize: "clamp(2.4rem,5vw,3.5rem)", color: T.terra }}
                  >
                    {s.value}<span style={{ fontSize: "0.6em" }}>{s.suffix}</span>
                  </div>
                  <div className="font-mono text-xs uppercase tracking-widest" style={{ color: T.inkLight }}>
                    {s.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════
            DISEASE MODULES
        ═══════════════════════════════════════ */}
        <section id="diseases" className="diseases-section py-28 px-6" style={{ background: T.parchment }}>
          <div className="container mx-auto max-w-6xl">
            <div className="mb-16">
              <p className="eyebrow-label font-mono text-xs uppercase tracking-widest mb-3" style={{ color: T.terra }}>
                Coverage
              </p>
              <h2 className="section-heading font-serif font-semibold leading-tight"
                style={{ fontSize: "clamp(2rem,4vw,3rem)", color: T.ink }}>
                Four conditions. <br />
                <span style={{ color: T.inkMid }}>Comprehensive screening.</span>
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {diseases.map((d) => (
                <div
                  key={d.name}
                  className="disease-card relative rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 cursor-default"
                  style={{ background: "#fff", border: `1px solid ${T.border}` }}
                >
                  {/* Left accent stripe */}
                  <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl" style={{ background: d.color }} />

                  <div className="p-8 pl-9">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-5">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl flex items-center justify-center"
                          style={{ background: `${d.color}18` }}>
                          <d.icon className="w-5 h-5" style={{ color: d.color }} />
                        </div>
                        <div>
                          <h3 className="font-serif text-2xl font-semibold leading-none" style={{ color: T.ink }}>
                            {d.name}
                          </h3>
                          <span className="font-mono text-[11px]" style={{ color: T.inkLight }}>
                            {d.inputs} clinical inputs
                          </span>
                        </div>
                      </div>
                      <div
                        className="rounded-full px-3 py-1 text-xs font-mono font-semibold flex-shrink-0"
                        style={{ background: `${d.levelColor}18`, color: d.levelColor }}
                      >
                        {d.level}
                      </div>
                    </div>

                    {/* Description */}
                    <p className="text-sm leading-relaxed mb-6" style={{ color: T.inkMid }}>
                      {d.desc}
                    </p>

                    {/* Risk gauge */}
                    <RiskGauge pct={d.riskPct} color={d.levelColor} />

                    {/* Divider */}
                    <div className="my-6" style={{ borderTop: `1px solid ${T.border}` }} />

                    {/* Factor importance bars */}
                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-widest mb-3" style={{ color: T.inkGhost }}>
                        Top risk factors
                      </p>
                      <div className="space-y-3">
                        {d.factors.map((f, fi) => (
                          <FactorBar key={f.label} label={f.label} w={f.w} color={d.color} index={fi} />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════
            HOW IT WORKS
        ═══════════════════════════════════════ */}
        <section id="how-it-works" className="steps-section py-28 px-6"
          style={{ background: T.parchmentLo, borderTop: `1px solid ${T.border}` }}>
          <div className="container mx-auto max-w-5xl">
            <div className="mb-16">
              <p className="eyebrow-label font-mono text-xs uppercase tracking-widest mb-3" style={{ color: T.terra }}>
                Process
              </p>
              <h2 className="section-heading font-serif font-semibold"
                style={{ fontSize: "clamp(2rem,4vw,3rem)", color: T.ink }}>
                From data to insight <br />
                <span style={{ color: T.inkMid }}>in four steps.</span>
              </h2>
            </div>

            <div className="relative">
              {/* Scrub-animated connector line */}
              <div className="step-line absolute left-[27px] top-8 bottom-8 w-0.5 hidden md:block"
                style={{ background: `linear-gradient(to bottom, ${T.terra}, ${T.border}60)` }}
              />
              <div className="space-y-0">
                {steps.map((step, i) => (
                  <div key={step.num} className="step-item flex gap-8 items-start relative">
                    <div
                      className="flex-shrink-0 w-14 h-14 rounded-full flex items-center justify-center z-10 transition-all"
                      style={{
                        background: i === 0 ? T.terra : "#fff",
                        color: i === 0 ? "#fff" : T.terra,
                        border: `2px solid ${i === 0 ? T.terra : T.border}`,
                        boxShadow: i === 0 ? `0 0 0 6px ${T.terraDim}` : "none",
                      }}
                    >
                      <span className="font-mono text-sm font-bold">{step.num}</span>
                    </div>
                    <div className="pb-14 pt-2 flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-serif text-xl font-semibold" style={{ color: T.ink }}>
                          {step.title}
                        </h3>
                        <span
                          className="rounded-full px-2.5 py-0.5 text-[10px] font-mono hidden sm:inline-flex"
                          style={{ background: T.parchment, color: T.inkLight, border: `1px solid ${T.border}` }}
                        >
                          {step.tag}
                        </span>
                      </div>
                      <p className="text-sm leading-relaxed" style={{ color: T.inkMid }}>
                        {step.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════
            MODEL COMPARISON PREVIEW
        ═══════════════════════════════════════ */}
        <section className="models-section py-28 px-6"
          style={{ background: T.parchment, borderTop: `1px solid ${T.border}` }}>
          <div className="container mx-auto max-w-6xl">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <div className="models-text-col">
                <p className="eyebrow-label font-mono text-xs uppercase tracking-widest mb-3" style={{ color: T.terra }}>
                  Multi-model comparison
                </p>
                <h2 className="section-heading font-serif font-semibold mb-6"
                  style={{ fontSize: "clamp(2rem,4vw,3rem)", color: T.ink }}>
                  Three models, <br />
                  <span style={{ color: T.inkMid }}>one input, full transparency.</span>
                </h2>
                <p className="text-base leading-relaxed mb-8" style={{ color: T.inkMid }}>
                  Different algorithms see data differently. We run all three against your inputs
                  simultaneously so you can see where they agree — and interrogate the disagreement
                  near risk thresholds.
                </p>
                <ul className="space-y-3">
                  {[
                    "CV-winning model highlighted by default",
                    "Switch models without re-entering data",
                    "SHAP explanation rebuilds per selected model",
                  ].map((pt) => (
                    <li key={pt} className="flex items-center gap-3 text-sm" style={{ color: T.inkMid }}>
                      <CheckCircle2 className="w-4 h-4 flex-shrink-0" style={{ color: T.statusLow }} />
                      {pt}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="models-panel rounded-2xl overflow-hidden"
                style={{ background: "#fff", border: `1px solid ${T.border}`, boxShadow: "0 24px 64px -16px rgba(28,21,16,0.13)" }}>
                <div className="h-1" style={{ background: `linear-gradient(to right, ${T.clay}, ${T.plum}, ${T.gold})` }} />
                <div className="p-8">
                  <div className="font-mono text-xs uppercase tracking-widest mb-1" style={{ color: T.inkLight }}>
                    Prediction Analysis
                  </div>
                  <h3 className="font-serif text-2xl font-medium mb-6" style={{ color: T.ink }}>
                    Heart Disease Risk
                  </h3>

                  <div className="flex gap-1 p-1 rounded-xl mb-8" style={{ background: T.parchmentLo }}>
                    {models.map((m) => (
                      <button key={m.name}
                        className="flex-1 py-1.5 rounded-lg text-xs font-mono font-medium transition-all"
                        style={{
                          background: m.selected ? "#fff" : "transparent",
                          color: m.selected ? m.color : T.inkLight,
                          boxShadow: m.selected ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
                        }}
                      >
                        {m.abbr}
                      </button>
                    ))}
                  </div>

                  <div className="space-y-4 mb-6">
                    <div className="font-mono text-xs uppercase tracking-widest mb-2" style={{ color: T.inkLight }}>
                      Risk score by model
                    </div>
                    {models.map((m) => (
                      <div key={m.name}>
                        <div className="flex justify-between items-center mb-1.5">
                          <span className="text-sm font-medium" style={{ color: T.ink }}>{m.name}</span>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm font-semibold" style={{ color: m.color }}>
                              {m.pct}%
                            </span>
                            {m.selected && (
                              <span className="rounded-full px-2 py-0.5 text-[10px] font-mono"
                                style={{ background: `${m.color}18`, color: m.color }}>
                                Active
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="h-2.5 rounded-full overflow-hidden" style={{ background: T.parchmentLo }}>
                          <div className="model-bar-inner h-full rounded-full"
                            style={{ width: `${m.pct}%`, background: m.selected ? m.color : `${m.color}80` }} />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Threshold annotation */}
                  <div className="flex items-start gap-3 rounded-xl p-4 text-sm"
                    style={{ background: `${T.statusModerate}10`, border: `1px solid ${T.statusModerate}25` }}>
                    <div className="w-2 h-2 rounded-full flex-shrink-0 mt-1" style={{ background: T.statusModerate }} />
                    <span style={{ color: T.statusModerate }}>
                      Random Forest scores this input as <strong>High Risk</strong> (61%) — above the 60% clinical threshold. LR disagrees at 38%.
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════
            BUILT DIFFERENT — bento grid
        ═══════════════════════════════════════ */}
        <section id="features" className="features-section py-28 px-6"
          style={{ background: T.parchmentLo, borderTop: `1px solid ${T.border}` }}>
          <div className="container mx-auto max-w-6xl">
            <div className="mb-16 text-center">
              <p className="eyebrow-label font-mono text-xs uppercase tracking-widest mb-3" style={{ color: T.terra }}>
                Built different
              </p>
              <h2 className="section-heading font-serif font-semibold"
                style={{ fontSize: "clamp(2rem,4vw,3rem)", color: T.ink }}>
                Designed for transparency.
              </h2>
              <p className="mt-4 text-base max-w-xl mx-auto" style={{ color: T.inkMid }}>
                Every design decision points back to one principle: you should always be able to trace why the model said what it said.
              </p>
            </div>

            {/* Bento grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

              {/* ── SHAP (tall, spans 2 rows on md) ── */}
              <div className="bento-shap md:row-span-2 rounded-2xl p-8 flex flex-col"
                style={{ background: "#fff", border: `1px solid ${T.border}`, minHeight: 460 }}>
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-5"
                  style={{ background: T.terraDim }}>
                  <Brain className="w-6 h-6" style={{ color: T.terra }} />
                </div>
                <h4 className="font-serif text-2xl font-semibold mb-3" style={{ color: T.ink }}>
                  SHAP Explainability
                </h4>
                <p className="text-sm leading-relaxed mb-8" style={{ color: T.inkMid }}>
                  Every prediction comes with a waterfall chart showing exactly which factors pushed your
                  score higher and which ones pulled it down — with their magnitudes.
                </p>

                {/* Mini SHAP waterfall */}
                <div className="flex-1 rounded-xl p-5"
                  style={{ background: T.parchmentHi, border: `1px solid ${T.border}` }}>
                  <div className="font-mono text-[10px] uppercase tracking-widest mb-4" style={{ color: T.inkGhost }}>
                    Feature attribution — Heart Disease
                  </div>
                  <div className="space-y-3">
                    {shapBars.map((b) => (
                      <div key={b.label}>
                        <div className="flex justify-between mb-1">
                          <span className="text-xs font-medium" style={{ color: T.inkMid }}>{b.label}</span>
                          <span className="font-mono text-xs"
                            style={{ color: b.pos ? T.statusHigh : T.statusLow }}>
                            {b.pos ? "+" : ""}{b.val.toFixed(2)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {!b.pos && (
                            <div className="flex-1 flex justify-end">
                              <div className="shap-bar-fill h-2 rounded-full"
                                style={{
                                  width: `${Math.abs(b.val) * 180}px`,
                                  maxWidth: "100%",
                                  background: T.statusLow,
                                  opacity: 0.7,
                                }} />
                            </div>
                          )}
                          <div className="w-px h-4 flex-shrink-0" style={{ background: T.border }} />
                          {b.pos && (
                            <div className="flex-1">
                              <div className="shap-bar-fill h-2 rounded-full"
                                style={{
                                  width: `${Math.abs(b.val) * 180}px`,
                                  maxWidth: "100%",
                                  background: T.statusHigh,
                                  opacity: 0.75,
                                }} />
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between mt-4">
                    <span className="font-mono text-[10px]" style={{ color: T.statusLow }}>← Decreases risk</span>
                    <span className="font-mono text-[10px]" style={{ color: T.statusHigh }}>Increases risk →</span>
                  </div>
                </div>
              </div>

              {/* ── Multi-model comparison ── */}
              <div className="bento-multimodel md:col-span-2 rounded-2xl p-8"
                style={{ background: "#fff", border: `1px solid ${T.border}` }}>
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-5"
                  style={{ background: `${T.plum}15` }}>
                  <Layers className="w-6 h-6" style={{ color: T.plum }} />
                </div>
                <h4 className="font-serif text-2xl font-semibold mb-3" style={{ color: T.ink }}>
                  Multi-Model Comparison
                </h4>
                <p className="text-sm leading-relaxed mb-6" style={{ color: T.inkMid }}>
                  Logistic Regression, Random Forest, and XGBoost run simultaneously on your inputs.
                  Disagreements near the decision boundary are the most informative moments.
                </p>
                <div className="space-y-3">
                  {[
                    { name: "Logistic Regression", pct: 38, color: T.slate },
                    { name: "Random Forest",       pct: 61, color: T.plum },
                    { name: "XGBoost",             pct: 57, color: T.gold },
                  ].map((m) => (
                    <div key={m.name} className="flex items-center gap-4">
                      <span className="text-xs font-mono w-36 flex-shrink-0" style={{ color: T.inkLight }}>
                        {m.name}
                      </span>
                      <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: T.parchmentLo }}>
                        <div className="h-full rounded-full" style={{ width: `${m.pct}%`, background: m.color }} />
                      </div>
                      <span className="font-mono text-sm font-semibold w-10 text-right flex-shrink-0"
                        style={{ color: m.color }}>
                        {m.pct}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── History / trend ── */}
              <div className="bento-history md:col-span-2 rounded-2xl p-8"
                style={{ background: "#fff", border: `1px solid ${T.border}` }}>
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-5"
                  style={{ background: `${T.gold}15` }}>
                  <TrendingUp className="w-6 h-6" style={{ color: T.gold }} />
                </div>
                <h4 className="font-serif text-2xl font-semibold mb-3" style={{ color: T.ink }}>
                  Personal Risk History
                </h4>
                <p className="text-sm leading-relaxed mb-6" style={{ color: T.inkMid }}>
                  Every saved prediction builds your risk timeline. Trend charts show how your score
                  moves as your inputs change — the feedback loop that makes the tool actually useful.
                </p>
                {/* SVG sparkline */}
                <div className="rounded-xl px-5 py-4" style={{ background: T.parchmentHi, border: `1px solid ${T.border}` }}>
                  <div className="font-mono text-[10px] uppercase tracking-widest mb-3" style={{ color: T.inkGhost }}>
                    Diabetes risk — last 6 months
                  </div>
                  <svg viewBox="0 0 260 64" className="w-full" style={{ height: 64 }}>
                    <path
                      className="spark-path"
                      d="M0,48 L44,42 L88,36 L132,30 L176,24 L220,18 L260,14"
                      fill="none"
                      stroke={T.statusLow}
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeDasharray="300"
                      strokeDashoffset="0"
                    />
                    {[0,44,88,132,176,220,260].map((x, i) => {
                      const ys = [48,42,36,30,24,18,14];
                      return <circle key={x} cx={x} cy={ys[i]} r="3.5" fill={T.statusLow} opacity="0.7" />;
                    })}
                  </svg>
                  <div className="flex justify-between mt-1">
                    <span className="font-mono text-[10px]" style={{ color: T.inkGhost }}>Jan</span>
                    <span className="font-mono text-[10px]" style={{ color: T.inkGhost }}>Jun</span>
                  </div>
                </div>
              </div>

              {/* ── Privacy (full width) ── */}
              <div className="bento-privacy md:col-span-3 rounded-2xl p-8"
                style={{ background: T.ink, border: `1px solid ${T.ink}` }}>
                <div className="flex flex-col md:flex-row md:items-center gap-8">
                  <div className="flex-1">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-5"
                      style={{ background: "rgba(255,255,255,0.1)" }}>
                      <Lock className="w-6 h-6" style={{ color: T.parchment }} />
                    </div>
                    <h4 className="font-serif text-2xl font-semibold mb-3" style={{ color: T.parchmentHi }}>
                      Private by Design
                    </h4>
                    <p className="text-sm leading-relaxed" style={{ color: T.inkGhost }}>
                      Nothing is stored without your explicit consent. Delete individual records
                      or your entire account at any time — permanently.
                    </p>
                  </div>
                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      "Explicit consent before saving",
                      "Passwords hashed, never plaintext",
                      "Short-lived access tokens",
                      "Permanent deletion, no soft-deletes",
                    ].map((item) => (
                      <div key={item} className="flex items-center gap-3 rounded-xl px-4 py-3"
                        style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
                        <CheckCircle2 className="w-4 h-4 flex-shrink-0" style={{ color: T.statusLow }} />
                        <span className="text-sm" style={{ color: T.inkGhost }}>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════
            THREE WORKFLOW PATHS
        ═══════════════════════════════════════ */}
        <section className="paths-section py-28 px-6"
          style={{ background: T.parchment, borderTop: `1px solid ${T.border}` }}>
          <div className="container mx-auto max-w-6xl">
            <div className="mb-16">
              <p className="eyebrow-label font-mono text-xs uppercase tracking-widest mb-3" style={{ color: T.terra }}>
                Who it's for
              </p>
              <h2 className="section-heading font-serif font-semibold"
                style={{ fontSize: "clamp(2rem,4vw,3rem)", color: T.ink }}>
                One tool. <br />
                <span style={{ color: T.inkMid }}>Three distinct workflows.</span>
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {paths.map((p, i) => (
                <div
                  key={p.title}
                  className="path-card rounded-2xl flex flex-col overflow-hidden"
                  style={{ background: "#fff", border: `1px solid ${T.border}` }}
                >
                  {/* Top coloured header */}
                  <div className="px-8 pt-8 pb-7"
                    style={{ background: `${p.color}0e`, borderBottom: `1px solid ${p.color}20` }}>
                    <div className="flex items-start justify-between mb-5">
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center"
                        style={{ background: `${p.color}18` }}>
                        <p.icon className="w-6 h-6" style={{ color: p.color }} />
                      </div>
                      <span className="rounded-full px-3 py-1 text-[11px] font-mono font-medium"
                        style={{ background: `${p.color}18`, color: p.color }}>
                        {p.tag}
                      </span>
                    </div>
                    <h3 className="font-serif text-2xl font-semibold mb-2" style={{ color: T.ink }}>
                      {p.title}
                    </h3>
                    <p className="text-sm" style={{ color: T.inkMid }}>{p.subtitle}</p>
                  </div>

                  {/* Workflow steps */}
                  <div className="px-8 py-7 flex-1">
                    <p className="font-mono text-[10px] uppercase tracking-widest mb-4" style={{ color: T.inkGhost }}>
                      Typical workflow
                    </p>
                    <ol className="space-y-4">
                      {p.steps.map((step, si) => (
                        <li key={si} className="flex gap-4 items-start">
                          <span
                            className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-mono font-bold mt-0.5"
                            style={{ background: `${p.color}18`, color: p.color }}
                          >
                            {si + 1}
                          </span>
                          <span className="text-sm leading-snug" style={{ color: T.inkMid }}>
                            {step}
                          </span>
                        </li>
                      ))}
                    </ol>
                  </div>

                  {/* Bottom metric */}
                  <div className="px-8 pb-8">
                    <div className="rounded-xl px-4 py-3 flex items-center gap-3"
                      style={{ background: T.parchmentLo, border: `1px solid ${T.border}` }}>
                      <TrendingUp className="w-4 h-4 flex-shrink-0" style={{ color: p.color }} />
                      <span className="text-xs font-mono" style={{ color: T.inkMid }}>
                        {p.metric}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════
            PRIVACY & TRUST
        ═══════════════════════════════════════ */}
        <section className="trust-section py-28 px-6"
          style={{ background: T.parchmentLo, borderTop: `1px solid ${T.border}` }}>
          <div className="container mx-auto max-w-5xl">
            <div className="grid lg:grid-cols-2 gap-16 items-start">
              <div>
                <p className="eyebrow-label font-mono text-xs uppercase tracking-widest mb-3" style={{ color: T.terra }}>
                  Your data, your rules
                </p>
                <h2 className="section-heading font-serif font-semibold mb-6"
                  style={{ fontSize: "clamp(2rem,4vw,3rem)", color: T.ink }}>
                  Private by design. <br />
                  <span style={{ color: T.inkMid }}>Transparent by default.</span>
                </h2>
                <p className="text-base leading-relaxed mb-6" style={{ color: T.inkMid }}>
                  We built the data layer with the assumption that what you enter here is personal —
                  because it is. No health data is stored without your explicit, logged consent.
                </p>
                <p className="text-base leading-relaxed" style={{ color: T.inkMid }}>
                  You can delete individual predictions, all history, or your entire account at any time.
                  Deletion is permanent and immediate.
                </p>
              </div>
              <div className="space-y-3">
                {trustItems.map(({ icon: Icon, text }, i) => (
                  <div key={i} className="trust-item flex items-center gap-4 rounded-xl px-5 py-4"
                    style={{ background: "#fff", border: `1px solid ${T.border}` }}>
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: `${T.statusLow}14` }}>
                      <Icon className="w-4 h-4" style={{ color: T.statusLow }} />
                    </div>
                    <span className="text-sm" style={{ color: T.inkMid }}>{text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════
            CTA
        ═══════════════════════════════════════ */}
        <section className="cta-section py-36 px-6 relative overflow-hidden" style={{ background: T.ink }}>
          <div className="pointer-events-none absolute -top-24 -right-24 w-[400px] h-[400px] rounded-full blur-[100px] opacity-20"
            style={{ background: T.terra }} />
          <div className="pointer-events-none absolute -bottom-24 -left-24 w-[300px] h-[300px] rounded-full blur-[100px] opacity-10"
            style={{ background: T.slate }} />

          <div className="cta-inner relative container mx-auto max-w-2xl text-center">
            <p className="eyebrow-label font-mono text-xs uppercase tracking-widest mb-4" style={{ color: T.terra }}>
              Get started
            </p>
            <h2 className="font-serif font-semibold mb-6 leading-tight"
              style={{ fontSize: "clamp(2.2rem,5vw,3.5rem)", color: T.parchmentHi }}>
              Start your risk assessment today.
            </h2>
            <p className="text-base mb-10 leading-relaxed" style={{ color: T.inkGhost }}>
              No credit card required. Create an account, run your first prediction, and see exactly
              why the model scored you the way it did — all in under five minutes.
            </p>
            <Link href="/signup">
              <button
                className="inline-flex items-center gap-3 px-10 py-4 rounded-xl text-base font-semibold transition-all hover:opacity-90 hover:-translate-y-0.5 group"
                style={{ background: T.terra, color: "#fff", boxShadow: `0 8px 40px ${T.terra}50` }}
              >
                Create Free Account
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </Link>
            <p className="mt-6 font-mono text-xs" style={{ color: `${T.inkLight}70` }}>
              Educational tool only — not a medical diagnosis.
            </p>
          </div>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className="py-10 px-6" style={{ borderTop: `1px solid ${T.border}`, background: T.parchment }}>
        <div className="container mx-auto max-w-6xl flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <Activity className="h-4 w-4" style={{ color: T.terra }} />
            <span className="font-serif text-base font-medium" style={{ color: T.ink }}>
              HealthRisk Predictor
            </span>
          </div>
          <p className="font-mono text-xs text-center" style={{ color: T.inkLight }}>
            Educational tool only — not a medical diagnosis.
          </p>
          <p className="font-mono text-xs" style={{ color: T.inkGhost }}>
            © {new Date().getFullYear()} HealthRisk Predictor
          </p>
        </div>
      </footer>
    </div>
  );
}
```