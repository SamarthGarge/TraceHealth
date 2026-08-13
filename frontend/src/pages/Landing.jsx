import React, { useRef, useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Activity,
  HeartPulse,
  Stethoscope,
  Wind,
  ShieldCheck,
  Lock,
  CheckCircle2,
  Brain,
  Layers,
  TrendingUp,
  Zap,
  FileText,
  Sparkles,
  ArrowUpRight,
  Menu,
  X,
} from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger, useGSAP);

/* ─── Helpers ─── */
const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function scrollTo(e, id) {
  e.preventDefault();
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
}

/* Custom easing curves (Emil Kowalski principles) */
const EASE_OUT_STRONG = "cubic-bezier(0.23, 1, 0.32, 1)";
const EASE_DRAWER = "cubic-bezier(0.32, 0.72, 0, 1)";

/* ═══════════════════════════════════════════════════════════════════════════════
   DATA
═══════════════════════════════════════════════════════════════════════════════ */

const diseases = [
  {
    key: "diabetes", name: "Diabetes", icon: Activity, hex: "#C25539",
    inputs: 8, tagline: "Metabolic markers decoded",
    desc: "Glucose, insulin sensitivity, BMI, and family predisposition — scored by three models simultaneously.",
    features: ["Blood Glucose", "BMI", "Insulin", "Age"],
  },
  {
    key: "heart", name: "Heart Disease", icon: HeartPulse, hex: "#8B5D6B",
    inputs: 13, tagline: "Cardiovascular risk clarity",
    desc: "Cholesterol, blood pressure, ECG patterns, and 10 more cardiac indicators assessed in parallel.",
    features: ["Cholesterol", "Blood Pressure", "ECG", "Max Heart Rate"],
  },
  {
    key: "tb", name: "Tuberculosis", icon: Stethoscope, hex: "#5B7C99",
    inputs: 9, tagline: "Respiratory symptom screening",
    desc: "Cough duration, exposure history, and immune markers screened for TB probability.",
    features: ["Cough Duration", "Exposure Risk", "Night Sweats", "Fever"],
  },
  {
    key: "cancer", name: "Lung Cancer", icon: Wind, hex: "#A68A4E",
    inputs: 11, tagline: "Malignancy risk factors",
    desc: "Smoking history, occupational exposure, and respiratory symptoms weighed for cancer likelihood.",
    features: ["Smoking Index", "Chest Pain", "Breath Difficulty", "Fatigue"],
  },
];

const shapBars = [
  { label: "Cholesterol", val: +0.41, pos: true },
  { label: "Blood Pressure", val: +0.29, pos: true },
  { label: "Age", val: +0.16, pos: true },
  { label: "Physical Activity", val: -0.19, pos: false },
  { label: "Dietary Habits", val: -0.08, pos: false },
];

const heroModels = [
  { name: "Logistic Regression", pct: 38, hex: "#5B7C99" },
  { name: "Random Forest", pct: 61, hex: "#8B5D6B", best: true },
  { name: "XGBoost", pct: 57, hex: "#A68A4E" },
];

/* ═══════════════════════════════════════════════════════════════════════════════
   ANIMATED COUNTER COMPONENT
═══════════════════════════════════════════════════════════════════════════════ */
function AnimatedCounter({ end, suffix = "", duration = 1.4 }) {
  const ref = useRef(null);
  const [val, setVal] = useState(0);
  const [triggered, setTriggered] = useState(false);

  useEffect(() => {
    if (!ref.current || prefersReducedMotion()) { setVal(end); return; }
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !triggered) {
        setTriggered(true);
        const start = performance.now();
        const animate = (now) => {
          const t = Math.min((now - start) / (duration * 1000), 1);
          const eased = 1 - Math.pow(1 - t, 3);
          setVal(Math.round(eased * end));
          if (t < 1) requestAnimationFrame(animate);
        };
        requestAnimationFrame(animate);
      }
    }, { threshold: 0.3 });
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, [end, duration, triggered]);

  return <span ref={ref}>{val}{suffix}</span>;
}

/* ═══════════════════════════════════════════════════════════════════════════════
   TILT CARD COMPONENT (3D depth on hover — Kowalski spring-like feel)
═══════════════════════════════════════════════════════════════════════════════ */
function TiltCard({ children, className = "", style = {}, ...props }) {
  const cardRef = useRef(null);

  const handleMove = useCallback((e) => {
    if (prefersReducedMotion() || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    gsap.to(cardRef.current, {
      rotateY: x * 6, rotateX: -y * 6,
      duration: 0.4, ease: "power2.out",
    });
  }, []);

  const handleLeave = useCallback(() => {
    if (!cardRef.current) return;
    gsap.to(cardRef.current, {
      rotateY: 0, rotateX: 0,
      duration: 0.6, ease: "power3.out",
    });
  }, []);

  return (
    <div
      ref={cardRef}
      className={className}
      style={{ ...style, perspective: "800px", transformStyle: "preserve-3d" }}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      {...props}
    >
      {children}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   TYPEWRITER HEADLINE COMPONENT
   Types out text character by character with a blinking cursor.
═══════════════════════════════════════════════════════════════════════════════ */
function TypewriterHeadline() {
  const lines = [
    { text: "Know your risk.", color: "text-ink" },
    { text: "Know why.", color: "text-terra" },
  ];
  const [displayLines, setDisplayLines] = useState(() => lines.map(() => ""));
  const [cursorLine, setCursorLine] = useState(0);
  const [done, setDone] = useState(false);
  const charDelay = 65;
  const lineDelay = 400;

  useEffect(() => {
    if (prefersReducedMotion()) {
      setDisplayLines(lines.map((l) => l.text));
      setDone(true);
      return;
    }
    let lineIdx = 0;
    let charIdx = 0;
    let timeout;

    function typeNext() {
      if (lineIdx >= lines.length) { setDone(true); return; }
      const currentText = lines[lineIdx].text;
      if (charIdx <= currentText.length) {
        setDisplayLines((prev) => {
          const next = [...prev];
          next[lineIdx] = currentText.slice(0, charIdx);
          return next;
        });
        setCursorLine(lineIdx);
        charIdx++;
        timeout = setTimeout(typeNext, charDelay);
      } else {
        lineIdx++;
        charIdx = 0;
        timeout = setTimeout(typeNext, lineDelay);
      }
    }
    timeout = setTimeout(typeNext, 600);
    return () => clearTimeout(timeout);
  }, []);

  return (
    <h1
      className="font-display font-semibold leading-[1.04] tracking-tight hero-typewriter"
      style={{ fontSize: "clamp(2.8rem, 6vw, 4.8rem)" }}
      aria-label="Know your risk. Know why."
    >
      {lines.map((line, i) => (
        <React.Fragment key={i}>
          <span className={line.color}>
            {displayLines[i] || ""}
          </span>
          {/* Blinking cursor — shows on current typing line or at end */}
          {((!done && cursorLine === i) || (done && i === lines.length - 1)) && (
            <span
              className="inline-block w-[3px] ml-0.5 animate-pulse"
              style={{
                height: "0.85em",
                background: "#C25539",
                borderRadius: 1,
                verticalAlign: "baseline",
                marginBottom: "-0.05em",
              }}
              aria-hidden="true"
            />
          )}
          {i < lines.length - 1 && <br />}
        </React.Fragment>
      ))}
    </h1>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   LANDING PAGE
   Hallmark:  Editorial Luxury vibe, Asymmetric Editorial Split layout
   Taste:     VARIANCE=7, MOTION=6, DENSITY=3 (Premium consumer health)
   Kowalski:  Custom ease-out curves, <300ms UI, scale-on-press, 3D tilt
═══════════════════════════════════════════════════════════════════════════════ */

export default function LandingPage() {
  const containerRef = useRef(null);
  const heroRef = useRef(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  /* ── Hero entrance timeline ─── */
  useGSAP(() => {
    if (prefersReducedMotion()) return;

    const tl = gsap.timeline({ defaults: { ease: EASE_OUT_STRONG } });

    tl.from(".hero-badge", { y: 12, opacity: 0, duration: 0.45 })
      .from(".hero-typewriter", { y: 16, opacity: 0, duration: 0.5 }, "-=0.2")
      .from(".hero-sub", { y: 16, opacity: 0, duration: 0.5 }, "-=0.35")
      .from(".hero-actions", { y: 14, opacity: 0, duration: 0.45 }, "-=0.25")
      .from(".hero-trust-row", { y: 10, opacity: 0, duration: 0.4 }, "-=0.2")
      .from(".hero-card-shell", {
        scale: 0.92, opacity: 0, rotateY: -8, duration: 0.9,
        ease: "back.out(1.15)", transformOrigin: "left center",
      }, "-=0.55");

    /* Parallax blobs */
    gsap.to(".hero-glow-1", {
      y: -70, scrollTrigger: { trigger: heroRef.current, start: "top top", end: "bottom top", scrub: 1.6 },
    });
    gsap.to(".hero-glow-2", {
      y: -45, scrollTrigger: { trigger: heroRef.current, start: "top top", end: "bottom top", scrub: 1.2 },
    });
  }, { scope: heroRef });

  /* ── Scroll-triggered animations ─── */
  useGSAP(() => {
    if (prefersReducedMotion()) return;

    /* Section headings — clip-path reveal (Kowalski technique) */
    gsap.utils.toArray(".s-head").forEach((el) => {
      gsap.from(el, {
        clipPath: "inset(0 0 100% 0)", y: 20, opacity: 0,
        duration: 0.8, ease: EASE_OUT_STRONG,
        immediateRender: false,
        scrollTrigger: { trigger: el, start: "top 90%" },
      });
    });

    /* Stat counters fade + slide */
    gsap.from(".stat-block", {
      y: 32, opacity: 0, duration: 0.6, stagger: 0.08,
      ease: EASE_OUT_STRONG, immediateRender: false,
      scrollTrigger: { trigger: ".stats-row", start: "top 85%" },
    });

    /* Disease cards — stagger with subtle 3D rotation */
    gsap.from(".d-card", {
      y: 50, opacity: 0, rotateX: 8, duration: 0.65, stagger: 0.1,
      ease: EASE_OUT_STRONG, immediateRender: false,
      transformOrigin: "bottom center",
      scrollTrigger: { trigger: ".diseases-grid", start: "top 82%" },
    });

    /* Steps — stagger from left */
    gsap.from(".step-block", {
      x: -36, opacity: 0, duration: 0.6, stagger: 0.1,
      ease: EASE_OUT_STRONG, immediateRender: false,
      scrollTrigger: { trigger: ".steps-area", start: "top 82%" },
    });

    /* Step connector line — scrub */
    gsap.set(".step-line-fill", { scaleY: 0, transformOrigin: "top center" });
    gsap.to(".step-line-fill", {
      scaleY: 1, ease: "none",
      scrollTrigger: { trigger: ".steps-area", start: "top 72%", end: "bottom 60%", scrub: 0.5 },
    });

    /* Bento cells — stagger with blur-in (high-end-visual-design entry) */
    gsap.from(".bento-item", {
      y: 40, opacity: 0, filter: "blur(4px)", duration: 0.8, stagger: 0.08,
      ease: EASE_OUT_STRONG, immediateRender: false,
      scrollTrigger: { trigger: ".bento-area", start: "top 82%" },
    });

    /* SHAP bars — scaleX GPU */
    gsap.from(".shap-fill", {
      scaleX: 0, duration: 0.7, stagger: 0.06,
      ease: EASE_OUT_STRONG, immediateRender: false,
      scrollTrigger: { trigger: ".bento-area", start: "top 76%" },
    });

    /* Trust items — stagger from right */
    gsap.from(".trust-pill", {
      x: 28, opacity: 0, duration: 0.5, stagger: 0.06,
      ease: "power2.out", immediateRender: false,
      scrollTrigger: { trigger: ".trust-area", start: "top 84%" },
    });

    /* CTA — scale in with blur */
    gsap.from(".cta-box", {
      scale: 0.95, opacity: 0, filter: "blur(6px)", duration: 0.9,
      ease: EASE_OUT_STRONG, immediateRender: false,
      scrollTrigger: { trigger: ".cta-area", start: "top 86%" },
    });

    /* Sparkline draw */
    gsap.from(".spark-line", {
      strokeDashoffset: 300, duration: 1.2, ease: "power2.out",
      immediateRender: false,
      scrollTrigger: { trigger: ".bento-area", start: "top 76%" },
    });
  }, { scope: containerRef });

  /* ═══════════════════════════════════════════════════════════════════════
     RENDER
  ═══════════════════════════════════════════════════════════════════════ */

  return (
    <div ref={containerRef} className="min-h-screen overflow-x-hidden bg-parchment text-ink font-body">

      {/* ════════════════════ FLOATING PILL NAV (Hallmark N5) ════════════════════ */}
      <header className="fixed top-0 left-0 right-0 z-50 flex justify-center pt-4 px-4 pointer-events-none">
        <nav className="pointer-events-auto flex items-center justify-between sm:justify-start gap-1 rounded-full bg-white/80 backdrop-blur-lg border border-border/50 shadow-lg shadow-ink/[0.04] px-2 py-1.5 w-full sm:w-auto">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 pl-2 pr-3 group">
            <img
              src="/new_logo.svg" alt="TraceHealth"
              className="h-8 w-8 rounded-lg object-contain transition-transform duration-200 group-hover:scale-105"
              style={{ transitionTimingFunction: EASE_OUT_STRONG }}
            />
            <span className="font-display text-lg font-semibold bg-gradient-to-r from-ink via-[#733B24] to-terra text-transparent bg-clip-text tracking-tight hidden sm:inline">
              TraceHealth
            </span>
          </Link>

          {/* Desktop links */}
          <div className="hidden md:flex items-center">
            {[
              { label: "Screening", id: "screening" },
              { label: "How it works", id: "how-it-works" },
              { label: "Features", id: "features" },
            ].map(({ label, id }) => (
              <a
                key={id}
                href={`#${id}`}
                onClick={(e) => scrollTo(e, id)}
                className="text-[13px] font-medium text-ink-mid hover:text-ink px-3 py-1.5 rounded-full hover:bg-parchment-lo transition-all duration-200"
                style={{ transitionTimingFunction: EASE_OUT_STRONG }}
              >
                {label}
              </a>
            ))}
          </div>

          {/* Separator */}
          <div className="hidden md:block w-px h-5 bg-border mx-1" />

          {/* Auth */}
          <Link to="/login" className="hidden md:inline-flex text-[13px] font-medium text-ink-mid hover:text-ink px-3 py-1.5 rounded-full hover:bg-parchment-lo transition-all duration-200">
            Log in
          </Link>
          <Link to="/predict/diabetes">
            <button
              className="hidden md:inline-flex items-center gap-1.5 text-[13px] font-semibold px-4 py-2 rounded-full bg-ink text-parchment hover:bg-ink-mid active:scale-[0.97] transition-all duration-200"
              style={{ transitionTimingFunction: EASE_OUT_STRONG }}
            >
              Run Prediction
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </Link>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-full hover:bg-parchment-lo transition-colors duration-200 flex-shrink-0"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen
              ? <X className="w-4.5 h-4.5 text-ink transition-transform duration-200 rotate-0" />
              : <Menu className="w-4.5 h-4.5 text-ink-mid" />
            }
          </button>
        </nav>

        {/* Mobile menu overlay */}
        {mobileMenuOpen && (
          <div className="md:hidden pointer-events-auto fixed inset-0 top-16 bg-white/95 backdrop-blur-xl z-40 flex flex-col items-center pt-16 gap-4 animate-in fade-in">
            {[
              { label: "Screening", id: "screening" },
              { label: "How it works", id: "how-it-works" },
              { label: "Features", id: "features" },
            ].map(({ label, id }, i) => (
              <a
                key={id}
                href={`#${id}`}
                onClick={(e) => { scrollTo(e, id); setMobileMenuOpen(false); }}
                className="text-lg font-medium text-ink-mid hover:text-ink transition-colors"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                {label}
              </a>
            ))}
            <div className="w-12 h-px bg-border my-2" />
            <Link to="/login" onClick={() => setMobileMenuOpen(false)} className="text-lg font-medium text-ink-mid">Log in</Link>
            <Link to="/predict/diabetes" onClick={() => setMobileMenuOpen(false)}>
              <button className="mt-2 px-8 py-3 rounded-full bg-ink text-parchment font-semibold">
                Run Prediction
              </button>
            </Link>
          </div>
        )}
      </header>

      <main>
        {/* ════════════════════ HERO ════════════════════
            Hallmark: Asymmetric editorial split. Left=copy, Right=artifact card.
            High-end: Double-bezel card architecture on the preview card.
            Kowalski: Per-word stagger entrance with rotateX, custom ease curves.
            Taste: VARIANCE=7, no generic centered hero.
        ════════════════════════════════════════════════ */}
        <section ref={heroRef} className="relative pt-32 pb-36 px-6 overflow-hidden min-h-[90vh] flex flex-col justify-center">
          {/* Ambient gradient orbs */}
          <div className="hero-glow-1 pointer-events-none absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full opacity-[0.08]" style={{ background: "radial-gradient(circle, #C25539 0%, transparent 70%)" }} />
          <div className="hero-glow-2 pointer-events-none absolute -bottom-48 -right-48 w-[460px] h-[460px] rounded-full opacity-[0.06]" style={{ background: "radial-gradient(circle, #5B7C99 0%, transparent 70%)" }} />

          {/* Noise overlay for physical feel (high-end-visual-design) */}
          <div className="pointer-events-none fixed inset-0 z-[1] opacity-[0.025]" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")", backgroundRepeat: "repeat" }} />

          <div className="relative z-10 mx-auto max-w-7xl w-full grid lg:grid-cols-[1.2fr_0.8fr] gap-16 lg:gap-24 items-center">
            {/* Left — editorial copy */}
            <div className="space-y-7">
              {/* Eyebrow badge */}
              <div className="hero-badge inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-[11px] font-mono uppercase tracking-[0.15em] border border-border bg-white/70 backdrop-blur-sm text-ink-light">
                <Sparkles className="w-3 h-3 text-terra" />
                Explainable AI Health Screening
              </div>

              {/* Headline — typewriter effect */}
              <TypewriterHeadline />

              <p className="hero-sub text-lg max-w-md leading-relaxed text-ink-mid">
                Screen four diseases with three ML models at once.
                Every result ships with SHAP explanations — so you
                understand exactly what drove your score.
              </p>

              {/* CTA group */}
              <div className="hero-actions flex flex-wrap items-center gap-4 sm:gap-6 pt-1">
                <Link to="/predict/diabetes">
                  {/* Double-element CTA button (high-end-visual-design Button-in-Button) */}
                  <button
                    className="group inline-flex items-center gap-3 pl-7 pr-2 py-2 rounded-full text-[15px] font-semibold bg-terra text-white shadow-lg shadow-terra/20 hover:shadow-xl hover:shadow-terra/25 active:scale-[0.97] transition-all duration-200"
                    style={{ transitionTimingFunction: EASE_OUT_STRONG }}
                  >
                    Start Screening
                    <span className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center group-hover:bg-white/30 group-hover:translate-x-0.5 transition-all duration-200 flex-shrink-0">
                      <ArrowRight className="w-4 h-4" />
                    </span>
                  </button>
                </Link>
                <a
                  href="#how-it-works"
                  onClick={(e) => scrollTo(e, "how-it-works")}
                  className="text-sm font-medium text-ink-mid hover:text-ink transition-colors duration-200 underline underline-offset-4 decoration-border-strong/40 hover:decoration-terra/50"
                  style={{ transitionTimingFunction: EASE_OUT_STRONG }}
                >
                  See how it works
                </a>
              </div>

              {/* Trust micro-row */}
              <div className="hero-trust-row flex flex-wrap items-center gap-x-6 gap-y-2 pt-2">
                {[
                  { icon: ShieldCheck, t: "No data stored without consent" },
                  { icon: Zap, t: "Results in under 2s" },
                  { icon: FileText, t: "PDF & image export" },
                ].map(({ icon: I, t }) => (
                  <div key={t} className="flex items-center gap-1.5">
                    <I className="w-3.5 h-3.5 text-sage" />
                    <span className="text-[11px] text-ink-light font-medium">{t}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right — Double-bezel preview card (high-end-visual-design Doppelrand) */}
            <TiltCard className="hero-card-shell hidden lg:block">
              {/* Outer shell */}
              <div className="rounded-[1.5rem] bg-ink/[0.03] border border-border/50 p-1.5 shadow-2xl shadow-ink/[0.06]">
                {/* Inner core */}
                <div className="rounded-[calc(1.5rem-6px)] bg-white overflow-hidden" style={{ boxShadow: "inset 0 1px 1px rgba(255,255,255,0.8)" }}>
                  {/* Gradient accent bar */}
                  <div className="h-1" style={{ background: "linear-gradient(90deg, #C25539 0%, #8B5D6B 40%, #5B7C99 70%, #A68A4E 100%)" }} />

                  <div className="p-6">
                    <div className="flex items-center justify-between mb-5">
                      <div>
                        <p className="font-mono text-[10px] uppercase tracking-widest text-ink-ghost">Live Preview</p>
                        <h3 className="font-display text-lg font-semibold text-ink mt-0.5">Heart Disease Risk</h3>
                      </div>
                      <span className="text-[10px] font-mono font-semibold px-2.5 py-1 rounded-full bg-status-moderate-dim text-status-moderate">
                        Moderate
                      </span>
                    </div>

                    {/* Model bars with animated fills */}
                    <div className="space-y-3 mb-5">
                      {heroModels.map((m) => (
                        <div key={m.name}>
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-[11px] font-medium text-ink-mid">{m.name}</span>
                            <span className="font-mono text-xs font-bold" style={{ color: m.hex }}>{m.pct}%</span>
                          </div>
                          <div className="h-[6px] rounded-full bg-parchment-lo overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${m.pct}%`,
                                background: m.best
                                  ? `linear-gradient(90deg, ${m.hex}, ${m.hex}cc)`
                                  : `${m.hex}60`,
                                transition: `width 1.2s ${EASE_DRAWER}`,
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Mini SHAP preview — inner bezel */}
                    <div className="rounded-xl p-3.5 bg-parchment-hi border border-border/60">
                      <p className="font-mono text-[9px] uppercase tracking-widest text-ink-ghost mb-2.5">Top SHAP contributors</p>
                      <div className="space-y-1.5">
                        {shapBars.slice(0, 3).map((b) => (
                          <div key={b.label} className="flex items-center gap-2">
                            <span className="text-[10px] text-ink-light w-20 shrink-0 truncate">{b.label}</span>
                            <div className="flex-1 flex items-center">
                              <div className="w-px h-3 bg-border shrink-0" />
                              <div
                                className="h-[3px] rounded-full ml-0.5"
                                style={{
                                  width: `${Math.abs(b.val) * 100}%`, maxWidth: "80%",
                                  background: b.pos ? "#B23A3A" : "#4D7A60", opacity: 0.6,
                                }}
                              />
                            </div>
                            <span className="font-mono text-[10px] w-8 text-right" style={{ color: b.pos ? "#B23A3A" : "#4D7A60" }}>
                              {b.pos ? "+" : ""}{b.val.toFixed(2)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </TiltCard>
          </div>

          {/* Scroll indicator */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-40">
            <div className="w-5 h-8 rounded-full border-2 border-ink-light flex items-start justify-center pt-1.5">
              <div className="w-1 h-2 rounded-full bg-ink-light animate-bounce" />
            </div>
          </div>
        </section>

        {/* ════════════════════ ANIMATED STATS RIBBON ════════════════════ */}
        <section className="stats-row py-14 bg-white border-y border-border overflow-hidden">
          <div className="mx-auto max-w-6xl px-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-y-8 gap-x-4">
              {[
                { n: 4, s: "", l: "Diseases screened" },
                { n: 3, s: "", l: "ML models per run" },
                { n: 100, s: "%", l: "SHAP-explainable" },
                { n: 0, s: "", l: "Data stored w/o consent" },
              ].map((s, i) => (
                <div key={i} className="stat-block text-center">
                  <div className="font-display font-semibold text-terra leading-none mb-1.5" style={{ fontSize: "clamp(2.2rem, 4.5vw, 3rem)" }}>
                    <AnimatedCounter end={s.n} suffix={s.s} />
                  </div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-ink-light">{s.l}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ════════════════════ DISEASE MODULES ════════════════════
            Hallmark: 2x2 grid, not horizontal scroll.
            High-end: Double-bezel cards, pill CTA reveal on hover.
            Kowalski: 3D rotateX entrance, active:scale feedback.
        ═══════════════════════════════════════════════════════════════ */}
        <section id="screening" className="py-28 px-6 bg-parchment">
          <div className="mx-auto max-w-7xl">
            <div className="s-head mb-16 max-w-2xl">
              <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-terra mb-3">Screening Modules</p>
              <h2 className="font-display font-semibold leading-tight" style={{ fontSize: "clamp(1.8rem, 3.5vw, 2.8rem)" }}>
                Four conditions. <span className="text-ink-mid">Three models each.</span>
              </h2>
              <p className="mt-4 text-base text-ink-mid leading-relaxed max-w-lg">
                Each module uses a tailored feature set. Predictions are independent — screen one or all four.
              </p>
            </div>

            <div className="diseases-grid grid grid-cols-1 md:grid-cols-2 gap-5">
              {diseases.map((d) => {
                const Icon = d.icon;
                return (
                  <Link
                    key={d.key}
                    to={`/predict/${d.key}`}
                    className="d-card group block h-full"
                    style={{ transformOrigin: "center bottom" }}
                  >
                    {/* Double-bezel wrapper */}
                    <div className="h-full rounded-[1.25rem] bg-ink/[0.02] border border-border/40 p-1 hover:border-border-strong hover:shadow-xl hover:shadow-ink/[0.05] transition-all duration-300" style={{ transitionTimingFunction: EASE_OUT_STRONG }}>
                      <div className="h-full rounded-[calc(1.25rem-4px)] bg-white p-6 flex flex-col" style={{ boxShadow: "inset 0 1px 0 rgba(255,255,255,0.9)" }}>
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: `${d.hex}10` }}>
                              <Icon className="w-5 h-5" style={{ color: d.hex }} />
                            </div>
                            <div>
                              <h3 className="font-display text-lg font-semibold text-ink leading-tight group-hover:text-terra transition-colors duration-200">
                                {d.name}
                              </h3>
                              <p className="text-[11px] text-ink-ghost font-mono">{d.tagline}</p>
                            </div>
                          </div>
                          <span className="font-mono text-[10px] text-ink-ghost bg-parchment rounded-full px-2.5 py-1 border border-border/50">
                            {d.inputs} inputs
                          </span>
                        </div>

                        <p className="text-sm text-ink-mid leading-relaxed mb-5 flex-1">{d.desc}</p>

                        {/* Feature pills */}
                        <div className="flex flex-wrap gap-1.5 mb-4">
                          {d.features.map((f) => (
                            <span key={f} className="text-[10px] px-2.5 py-0.5 rounded-full border border-border/50 bg-parchment-hi text-ink-light whitespace-nowrap">
                              {f}
                            </span>
                          ))}
                        </div>

                        {/* Hover CTA — slides up (Kowalski stagger entry) */}
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-terra opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-200" style={{ transitionTimingFunction: EASE_OUT_STRONG }}>
                          Start screening
                          <div className="w-5 h-5 rounded-full bg-terra/10 flex items-center justify-center">
                            <ArrowRight className="w-3 h-3" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        {/* ════════════════════ HOW IT WORKS ════════════════════ */}
        <section id="how-it-works" className="py-28 px-6 bg-parchment-lo border-t border-border">
          <div className="mx-auto max-w-5xl">
            <div className="s-head mb-16 max-w-xl">
              <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-terra mb-3">Process</p>
              <h2 className="font-display font-semibold leading-tight" style={{ fontSize: "clamp(1.8rem, 3.5vw, 2.8rem)" }}>
                From input to insight <span className="text-ink-mid">in four steps.</span>
              </h2>
            </div>

            <div className="steps-area relative">
              {/* Connector */}
              <div className="absolute left-[27px] top-8 bottom-8 w-0.5 hidden md:block bg-border">
                <div className="step-line-fill w-full h-full bg-terra" />
              </div>

              <div className="space-y-0">
                {[
                  { n: "01", t: "Select a disease module", d: "Choose Diabetes, Heart Disease, TB, or Lung Cancer. Each has a tailored input form with field-level guidance." },
                  { n: "02", t: "Enter your health data", d: "Input vitals and lifestyle indicators. All processing happens in-session — nothing stored without your explicit consent." },
                  { n: "03", t: "Compare three model scores", d: "Logistic Regression, Random Forest, and XGBoost each score your risk independently. Disagreements are surfaced." },
                  { n: "04", t: "Read the SHAP explanation", d: "A waterfall chart breaks down which factors pushed your score up or down, and by exactly how much." },
                ].map((step, i) => (
                  <div key={step.n} className="step-block flex gap-7 items-start relative">
                    <div
                      className="shrink-0 w-14 h-14 rounded-full flex items-center justify-center z-10 border-2 transition-all duration-300"
                      style={{
                        transitionTimingFunction: EASE_OUT_STRONG,
                        background: i === 0 ? "#C25539" : "#fff",
                        color: i === 0 ? "#fff" : "#C25539",
                        borderColor: i === 0 ? "#C25539" : "#DDD5C9",
                        boxShadow: i === 0 ? "0 0 0 6px rgba(194,85,57,0.08)" : "none",
                      }}
                    >
                      <span className="font-mono text-sm font-bold">{step.n}</span>
                    </div>
                    <div className="pb-14 pt-2 flex-1">
                      <h3 className="font-display text-xl font-semibold text-ink mb-1.5">{step.t}</h3>
                      <p className="text-sm leading-relaxed text-ink-mid max-w-md">{step.d}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ════════════════════ BENTO FEATURES ════════════════════
            High-end: Double-bezel on each cell, blur-in entry animation.
            Hallmark: Asymmetric bento, full-width dark privacy row.
        ═══════════════════════════════════════════════════════════════ */}
        <section id="features" className="bento-area py-28 px-6 bg-parchment border-t border-border">
          <div className="mx-auto max-w-6xl">
            <div className="s-head mb-16 max-w-xl">
              <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-terra mb-3">Capabilities</p>
              <h2 className="font-display font-semibold leading-tight" style={{ fontSize: "clamp(1.8rem, 3.5vw, 2.8rem)" }}>
                Designed for transparency.
              </h2>
              <p className="mt-4 text-base text-ink-mid leading-relaxed max-w-lg">
                Every design decision traces back to one principle: you should always know <em className="font-display">why</em> the model said what it said.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* SHAP — tall, row-span-2 */}
              <div className="bento-item md:row-span-2">
                <div className="h-full rounded-[1.25rem] bg-ink/[0.02] border border-border/40 p-1">
                  <div className="h-full rounded-[calc(1.25rem-4px)] bg-white p-7 flex flex-col" style={{ boxShadow: "inset 0 1px 0 rgba(255,255,255,0.9)", minHeight: 420 }}>
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4 bg-terra-dim">
                      <Brain className="w-5 h-5 text-terra" />
                    </div>
                    <h3 className="font-display text-xl font-semibold text-ink mb-2">SHAP Explainability</h3>
                    <p className="text-sm leading-relaxed text-ink-mid mb-6">
                      Every prediction includes a waterfall chart showing which factors pushed your score up or down.
                    </p>
                    {/* SHAP waterfall */}
                    <div className="flex-1 rounded-xl p-4 bg-parchment-hi border border-border/60">
                      <p className="font-mono text-[9px] uppercase tracking-widest text-ink-ghost mb-3">Feature Attribution</p>
                      <div className="space-y-2.5">
                        {shapBars.map((b) => (
                          <div key={b.label}>
                            <div className="flex justify-between mb-0.5">
                              <span className="text-[11px] font-medium text-ink-mid">{b.label}</span>
                              <span className="font-mono text-[11px]" style={{ color: b.pos ? "#B23A3A" : "#4D7A60" }}>
                                {b.pos ? "+" : ""}{b.val.toFixed(2)}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              {!b.pos && (
                                <div className="flex-1 flex justify-end">
                                  <div className="shap-fill h-1.5 rounded-full origin-right" style={{ width: `${Math.abs(b.val) * 170}px`, maxWidth: "100%", background: "#4D7A60", opacity: 0.55 }} />
                                </div>
                              )}
                              <div className="w-px h-3.5 shrink-0 bg-border" />
                              {b.pos && (
                                <div className="flex-1">
                                  <div className="shap-fill h-1.5 rounded-full origin-left" style={{ width: `${Math.abs(b.val) * 170}px`, maxWidth: "100%", background: "#B23A3A", opacity: 0.6 }} />
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="flex justify-between mt-3">
                        <span className="font-mono text-[8px] text-sage">&larr; Lowers risk</span>
                        <span className="font-mono text-[8px] text-status-high">Raises risk &rarr;</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Multi-Model — wide */}
              <div className="bento-item md:col-span-2">
                <div className="h-full rounded-[1.25rem] bg-ink/[0.02] border border-border/40 p-1">
                  <div className="h-full rounded-[calc(1.25rem-4px)] bg-white p-7" style={{ boxShadow: "inset 0 1px 0 rgba(255,255,255,0.9)" }}>
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4" style={{ background: "#8B5D6B10" }}>
                      <Layers className="w-5 h-5" style={{ color: "#8B5D6B" }} />
                    </div>
                    <h3 className="font-display text-xl font-semibold text-ink mb-2">Multi-Model Comparison</h3>
                    <p className="text-sm leading-relaxed text-ink-mid mb-5">
                      Three algorithms run simultaneously. Disagreements near the threshold are the most informative.
                    </p>
                    <div className="space-y-2.5">
                      {heroModels.map((m) => (
                        <div key={m.name} className="flex items-center gap-3">
                          <span className="text-[11px] font-mono w-32 shrink-0 text-ink-light">{m.name}</span>
                          <div className="flex-1 h-[5px] rounded-full bg-parchment-lo overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${m.pct}%`, background: m.hex }} />
                          </div>
                          <span className="font-mono text-xs font-bold w-8 text-right shrink-0" style={{ color: m.hex }}>{m.pct}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Risk Timeline — wide */}
              <div className="bento-item md:col-span-2">
                <div className="h-full rounded-[1.25rem] bg-ink/[0.02] border border-border/40 p-1">
                  <div className="h-full rounded-[calc(1.25rem-4px)] bg-white p-7" style={{ boxShadow: "inset 0 1px 0 rgba(255,255,255,0.9)" }}>
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4" style={{ background: "#A68A4E10" }}>
                      <TrendingUp className="w-5 h-5" style={{ color: "#A68A4E" }} />
                    </div>
                    <h3 className="font-display text-xl font-semibold text-ink mb-2">Personal Risk History</h3>
                    <p className="text-sm leading-relaxed text-ink-mid mb-5">
                      Every saved prediction builds your risk timeline. Track how your score moves as inputs change.
                    </p>
                    <div className="rounded-xl px-4 py-3 bg-parchment-hi border border-border/60">
                      <p className="font-mono text-[9px] uppercase tracking-widest text-ink-ghost mb-2">Diabetes risk — last 6 months</p>
                      <svg viewBox="0 0 260 64" className="w-full" style={{ height: 52 }} aria-label="Risk trend sparkline">
                        <path
                          className="spark-line"
                          d="M0,48 C22,46 33,44 44,42 C55,40 66,38 88,36 C110,34 121,32 132,30 C143,28 154,26 176,24 C198,22 209,20 220,18 C231,16 245,15 260,14"
                          fill="none" stroke="#4D7A60" strokeWidth="2" strokeLinecap="round"
                          strokeDasharray="300" strokeDashoffset="0"
                        />
                        {/* Gradient area fill */}
                        <path
                          d="M0,48 C22,46 33,44 44,42 C55,40 66,38 88,36 C110,34 121,32 132,30 C143,28 154,26 176,24 C198,22 209,20 220,18 C231,16 245,15 260,14 L260,64 L0,64 Z"
                          fill="url(#sparkGrad)" opacity="0.15"
                        />
                        <defs>
                          <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#4D7A60" />
                            <stop offset="100%" stopColor="#4D7A60" stopOpacity="0" />
                          </linearGradient>
                        </defs>
                        {[0,44,88,132,176,220,260].map((x, i) => {
                          const ys = [48,42,36,30,24,18,14];
                          return <circle key={x} cx={x} cy={ys[i]} r="2.5" fill="#4D7A60" opacity="0.5" />;
                        })}
                      </svg>
                      <div className="flex justify-between">
                        <span className="font-mono text-[9px] text-ink-ghost">Jan</span>
                        <span className="font-mono text-[9px] text-ink-ghost">Jun</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Privacy — full dark row */}
              <div className="bento-item md:col-span-3">
                <div className="rounded-[1.25rem] bg-ink p-7">
                  <div className="flex flex-col md:flex-row md:items-center gap-8">
                    <div className="flex-1">
                      <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4" style={{ background: "rgba(255,255,255,0.06)" }}>
                        <Lock className="w-5 h-5 text-parchment" />
                      </div>
                      <h3 className="font-display text-xl font-semibold text-parchment-hi mb-2">Private by Design</h3>
                      <p className="text-sm leading-relaxed text-ink-ghost max-w-md">
                        Nothing is stored without explicit consent. Delete individual records or your entire account — permanently, immediately.
                      </p>
                    </div>
                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {[
                        "Explicit consent before saving",
                        "Passwords hashed, never plaintext",
                        "Short-lived access tokens",
                        "Permanent deletion on request",
                      ].map((item) => (
                        <div key={item} className="flex items-center gap-2.5 rounded-lg px-3.5 py-2.5" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
                          <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-sage" />
                          <span className="text-xs text-ink-ghost">{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ════════════════════ TRUST ════════════════════ */}
        <section className="trust-area py-28 px-6 bg-parchment-lo border-t border-border">
          <div className="mx-auto max-w-5xl">
            <div className="grid lg:grid-cols-2 gap-16 items-start">
              <div className="s-head">
                <h2 className="font-display font-semibold mb-5 leading-tight" style={{ fontSize: "clamp(1.8rem, 3.5vw, 2.8rem)" }}>
                  Built for trust. <span className="text-ink-mid">Not for data collection.</span>
                </h2>
                <p className="text-base leading-relaxed text-ink-mid mb-4">
                  The data layer assumes everything you enter is personal — because it is.
                  No health data is stored without explicit, logged consent.
                </p>
                <p className="text-base leading-relaxed text-ink-mid">
                  Delete individual predictions, all history, or your entire account.
                  Deletion is permanent and immediate.
                </p>
              </div>
              <div className="space-y-2.5">
                {[
                  { icon: ShieldCheck, text: "Explicit consent required before any prediction is saved" },
                  { icon: Lock, text: "Passwords hashed server-side — never stored in plaintext" },
                  { icon: Zap, text: "Short-lived access tokens with automatic rotation" },
                  { icon: CheckCircle2, text: "Permanent deletion — no soft-deletes or hidden retention" },
                  { icon: Activity, text: "Per-user data isolation — zero cross-account leakage" },
                ].map(({ icon: I, text }, i) => (
                  <div key={i} className="trust-pill flex items-center gap-3.5 rounded-xl px-5 py-4 bg-white border border-border/60 hover:border-border-strong hover:shadow-md hover:shadow-ink/[0.03] transition-all duration-200" style={{ transitionTimingFunction: EASE_OUT_STRONG }}>
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: "rgba(77,122,96,0.07)" }}>
                      <I className="w-4 h-4 text-sage" />
                    </div>
                    <span className="text-sm text-ink-mid">{text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ════════════════════ CTA ════════════════════ */}
        <section className="cta-area py-36 px-6 relative overflow-hidden bg-ink">
          <div className="pointer-events-none absolute -top-24 -right-24 w-[400px] h-[400px] rounded-full opacity-[0.10]" style={{ background: "radial-gradient(circle, #C25539 0%, transparent 70%)" }} />
          <div className="pointer-events-none absolute -bottom-24 -left-24 w-[300px] h-[300px] rounded-full opacity-[0.06]" style={{ background: "radial-gradient(circle, #5B7C99 0%, transparent 70%)" }} />

          <div className="cta-box relative mx-auto max-w-2xl text-center">
            <h2 className="font-display font-semibold mb-5 leading-tight text-parchment-hi" style={{ fontSize: "clamp(1.8rem, 4.5vw, 3rem)" }}>
              Start your first screening.
            </h2>
            <p className="text-base mb-9 leading-relaxed text-ink-ghost max-w-md mx-auto">
              No account required for your first prediction. Choose a disease, enter your data,
              and see exactly why the model scored you the way it did.
            </p>
            <Link to="/predict/diabetes">
              <button
                className="group inline-flex items-center gap-3 pl-8 pr-2.5 py-2.5 rounded-full text-base font-semibold bg-terra text-white active:scale-[0.97] transition-all duration-200"
                style={{
                  transitionTimingFunction: EASE_OUT_STRONG,
                  boxShadow: "0 8px 32px rgba(194,85,57,0.3), 0 0 0 1px rgba(194,85,57,0.5)",
                }}
              >
                Run Prediction
                <span className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center group-hover:bg-white/30 group-hover:translate-x-0.5 transition-all duration-200">
                  <ArrowRight className="w-4.5 h-4.5" />
                </span>
              </button>
            </Link>
            <p className="mt-6 font-mono text-[10px] text-ink-ghost/40">
              Educational screening tool — not a medical diagnosis.
            </p>
          </div>
        </section>
      </main>

      {/* ════════════════════ FOOTER ════════════════════ */}
      <footer className="py-8 px-6 border-t border-border bg-parchment">
        <div className="mx-auto max-w-6xl flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <img src="/new_logo.svg" alt="TraceHealth" className="h-8 w-8 rounded-xl object-contain" />
            <span className="font-display text-lg font-medium bg-gradient-to-r from-ink via-[#733B24] to-terra text-transparent bg-clip-text">
              TraceHealth
            </span>
          </div>
          <p className="font-mono text-[10px] text-center text-ink-light">
            Educational tool only — not a medical diagnosis.
          </p>
          <div className="flex items-center gap-4">
            <p className="font-mono text-[10px] text-ink-ghost">&copy; {new Date().getFullYear()} TraceHealth</p>
            <Link to="/admin/login" className="font-mono text-[10px] text-ink-ghost hover:text-terra transition-colors duration-200">
              Admin
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
