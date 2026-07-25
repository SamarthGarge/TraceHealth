import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/layout/Sidebar";
import { useAuth } from "../context/AuthContext";
import { getHistory } from "../api/predictions";
import { listUploads } from "../api/uploads";
import { getModelsMetadata } from "../api/models";

// ── Constants ─────────────────────────────────────────────────────────────────

const DISEASE_META = {
  diabetes: { label: "Diabetes",      dot: "var(--chart-clay)",  path: "/predict/diabetes" },
  heart:    { label: "Heart Disease", dot: "var(--chart-plum)",  path: "/predict/heart" },
  tb:       { label: "Tuberculosis",  dot: "var(--chart-slate)", path: "/predict/tb" },
  cancer:   { label: "Lung Cancer",   dot: "var(--chart-gold)",  path: "/predict/cancer" },
};

const RISK_COLOR = {
  Low:      "var(--status-low)",
  Moderate: "var(--status-moderate)",
  High:     "var(--status-high)",
};

const RISK_BG = {
  Low:      "var(--status-low-dim)",
  Moderate: "var(--status-moderate-dim)",
  High:     "var(--status-high-dim)",
};

const MODEL_LABEL = { lr: "Logistic Reg.", rf: "Random Forest", xgb: "XGBoost" };
const MODEL_COLOR = {
  lr:  "var(--chart-slate)",
  rf:  "var(--chart-gold)",
  xgb: "var(--chart-plum)",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
  });
}

function formatBytes(bytes) {
  if (!bytes) return "—";
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, accent }) {
  return (
    <div className="bg-white border border-border rounded-xl px-6 py-5">
      <p className="text-xs font-mono tracking-widest text-ink-ghost uppercase mb-3">{label}</p>
      <p className="font-serif text-4xl font-semibold" style={{ color: accent ?? "var(--ink)" }}>
        {value ?? "—"}
      </p>
      {sub && <p className="text-xs text-ink-ghost mt-1.5">{sub}</p>}
    </div>
  );
}

function SectionHeader({ title, linkTo, linkLabel, navigate }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-sm font-semibold text-ink">{title}</h2>
      {linkTo && (
        <button
          onClick={() => navigate(linkTo)}
          className="text-xs text-terra hover:text-terra-dark underline transition-colors"
        >
          {linkLabel ?? "View all →"}
        </button>
      )}
    </div>
  );
}

function EmptyState({ icon, label, action, onAction }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <div className="w-10 h-10 rounded-xl bg-parchment-lo border border-border flex items-center justify-center mb-3">
        {icon}
      </div>
      <p className="text-sm text-ink-ghost mb-3">{label}</p>
      {action && (
        <button
          onClick={onAction}
          className="text-xs text-terra hover:text-terra-dark underline transition-colors"
        >
          {action}
        </button>
      )}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function Dashboard() {
  const { user, hasConsented } = useAuth();
  const navigate = useNavigate();

  const [recentPredictions, setRecentPredictions] = useState([]);
  const [predTotal, setPredTotal]                 = useState(null);
  const [recentUploads, setRecentUploads]         = useState([]);
  const [uploadTotal, setUploadTotal]             = useState(null);
  const [modelMeta, setModelMeta]                 = useState([]);
  const [loading, setLoading]                     = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const results = await Promise.allSettled([
        getHistory({ skip: 0, limit: 5 }),
        listUploads({ skip: 0, limit: 3 }),
        getModelsMetadata(),
      ]);

      if (results[0].status === "fulfilled") {
        setRecentPredictions(results[0].value.items ?? []);
        setPredTotal(results[0].value.total ?? 0);
      }
      if (results[1].status === "fulfilled") {
        setRecentUploads(results[1].value.items ?? []);
        setUploadTotal(results[1].value.total ?? 0);
      }
      if (results[2].status === "fulfilled") {
        setModelMeta(results[2].value.metadata ?? []);
      }
      setLoading(false);
    }
    load();
  }, []);

  // Derive a "highest risk" from recent predictions
  const highRiskCount = recentPredictions.filter((p) => p.ensemble_risk_level === "High").length;

  // Greeting
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const firstName = user?.name?.split(" ")[0] ?? "there";

  return (
    <div className="flex min-h-screen bg-parchment">
      <Sidebar />

      <main className="flex-1 p-8 max-w-6xl">
        {/* Header */}
        <header className="mb-8">
          <p className="text-xs font-mono tracking-widest text-ink-ghost uppercase mb-1">
            Overview
          </p>
          <h1 className="font-serif text-3xl text-ink">
            {greeting}, {firstName}
          </h1>
          <p className="text-ink-light text-sm mt-1">
            {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
        </header>

        {/* ── Stat cards ──────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            label="Predictions"
            value={predTotal ?? (loading ? "…" : "0")}
            sub="Total screenings run"
          />
          <StatCard
            label="High Risk"
            value={highRiskCount > 0 ? highRiskCount : (loading ? "…" : "0")}
            sub="In recent results"
            accent={highRiskCount > 0 ? "var(--status-high)" : undefined}
          />
          <StatCard
            label="Files"
            value={uploadTotal ?? (loading ? "…" : "0")}
            sub="Medical documents stored"
          />
          <StatCard
            label="Models"
            value="12"
            sub="Across 4 diseases"
            accent="var(--terra)"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── Left column (2/3 width) ───────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-6">

            {/* Quick predict */}
            <div className="bg-white border border-border rounded-xl p-6">
              <SectionHeader title="Run a Screening" navigate={navigate} />
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(DISEASE_META).map(([key, meta]) => (
                  <button
                    key={key}
                    onClick={() => navigate(meta.path)}
                    className="flex items-center gap-3 px-4 py-3 rounded-lg border border-border
                      hover:border-terra hover:bg-terra-dim transition-all text-left group"
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: meta.dot }}
                    />
                    <span className="text-sm font-medium text-ink group-hover:text-terra transition-colors">
                      {meta.label}
                    </span>
                    <svg
                      className="w-3.5 h-3.5 text-ink-ghost group-hover:text-terra ml-auto transition-colors"
                      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                ))}
              </div>

              {!hasConsented && (
                <p className="mt-4 text-xs text-ink-ghost bg-parchment-lo rounded-lg px-3 py-2">
                  💡 You haven't consented to data storage — predictions won't be saved to history.{" "}
                  <button
                    onClick={() => navigate("/profile")}
                    className="text-terra underline hover:text-terra-dark"
                  >
                    Enable in Profile →
                  </button>
                </p>
              )}
            </div>

            {/* Recent predictions */}
            <div className="bg-white border border-border rounded-xl p-6">
              <SectionHeader
                title="Recent Predictions"
                linkTo="/history"
                navigate={navigate}
              />

              {loading && (
                <div className="flex items-center gap-2 text-sm text-ink-ghost py-4">
                  <div className="w-3.5 h-3.5 border-2 border-terra border-t-transparent rounded-full animate-spin" />
                  Loading…
                </div>
              )}

              {!loading && recentPredictions.length === 0 && (
                <EmptyState
                  icon={
                    <svg className="w-5 h-5 text-ink-ghost" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  }
                  label="No predictions yet"
                  action="Run your first screening →"
                  onAction={() => navigate("/predict")}
                />
              )}

              {!loading && recentPredictions.length > 0 && (
                <div className="space-y-2">
                  {recentPredictions.map((p) => {
                    const meta = DISEASE_META[p.disease] ?? {};
                    const pct  = Math.round((p.ensemble_probability ?? 0) * 100);
                    const riskColor = RISK_COLOR[p.ensemble_risk_level] ?? RISK_COLOR.Moderate;
                    const riskBg    = RISK_BG[p.ensemble_risk_level]    ?? RISK_BG.Moderate;

                    return (
                      <div
                        key={p.id}
                        onClick={() => navigate(`/history/${p.id}`)}
                        className="flex items-center gap-4 px-4 py-3 rounded-lg border border-border
                          hover:border-border-strong hover:bg-parchment-lo transition-all cursor-pointer"
                      >
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: meta.dot ?? "var(--ink-ghost)" }} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-ink">{meta.label ?? p.disease}</p>
                          <p className="text-xs text-ink-ghost">{formatDate(p.created_at)}</p>
                        </div>
                        <span
                          className="text-sm font-mono font-semibold shrink-0"
                          style={{ color: riskColor }}
                        >
                          {pct}%
                        </span>
                        <span
                          className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold shrink-0"
                          style={{ color: riskColor, backgroundColor: riskBg }}
                        >
                          {p.ensemble_risk_level}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Model accuracy leaderboard */}
            {modelMeta.length > 0 && (
              <div className="bg-white border border-border rounded-xl p-6">
                <SectionHeader title="Model Accuracy" navigate={navigate} />
                <div className="space-y-4">
                  {modelMeta.map((meta) => {
                    const dm = DISEASE_META[meta.disease] ?? {};
                    const models = meta.models ?? {};
                    const bestAcc = Math.max(
                      ...(Object.values(models).map((m) => m.accuracy ?? 0))
                    );

                    return (
                      <div key={meta.disease}>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: dm.dot ?? "var(--ink-ghost)" }} />
                          <span className="text-xs font-semibold text-ink-mid">{dm.label ?? meta.disease}</span>
                          <span className="ml-auto text-xs font-mono text-ink-ghost">
                            best: {(bestAcc * 100).toFixed(1)}%
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          {["lr", "rf", "xgb"].map((mKey) => {
                            const m = models[mKey];
                            if (!m) return null;
                            const acc = m.accuracy ?? 0;
                            return (
                              <div key={mKey} className="bg-parchment-lo rounded-lg px-3 py-2">
                                <p className="text-[10px] font-mono text-ink-ghost mb-1">
                                  {MODEL_LABEL[mKey]}
                                </p>
                                <p
                                  className="text-sm font-semibold font-mono"
                                  style={{ color: MODEL_COLOR[mKey] }}
                                >
                                  {(acc * 100).toFixed(1)}%
                                </p>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* ── Right column (1/3 width) ──────────────────────────────────── */}
          <div className="space-y-6">

            {/* Recent uploads */}
            <div className="bg-white border border-border rounded-xl p-6">
              <SectionHeader
                title="Recent Files"
                linkTo="/uploads"
                navigate={navigate}
              />

              {loading && (
                <div className="flex items-center gap-2 text-sm text-ink-ghost py-4">
                  <div className="w-3.5 h-3.5 border-2 border-terra border-t-transparent rounded-full animate-spin" />
                  Loading…
                </div>
              )}

              {!loading && recentUploads.length === 0 && (
                <EmptyState
                  icon={
                    <svg className="w-5 h-5 text-ink-ghost" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  }
                  label="No files uploaded yet"
                  action="Upload a document →"
                  onAction={() => navigate("/uploads")}
                />
              )}

              {!loading && recentUploads.length > 0 && (
                <div className="space-y-2">
                  {recentUploads.map((f) => (
                    <div
                      key={f.id}
                      onClick={() => navigate("/uploads")}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-border
                        hover:border-border-strong hover:bg-parchment-lo transition-all cursor-pointer"
                    >
                      <svg className="w-4 h-4 text-ink-ghost shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-ink truncate">{f.filename}</p>
                        <p className="text-[10px] text-ink-ghost">{formatBytes(f.size)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick links */}
            <div className="bg-white border border-border rounded-xl p-6">
              <h2 className="text-sm font-semibold text-ink mb-4">Quick Links</h2>
              <div className="space-y-1">
                {[
                  { label: "Prediction History",  to: "/history",      icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" },
                  { label: "Uploads",             to: "/uploads",      icon: "M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" },
                  { label: "Symptom Check",       to: "/symptom-check",icon: "M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" },
                  { label: "Insights",            to: "/insights",     icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" },
                  { label: "Profile & Settings",  to: "/profile",      icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" },
                ].map(({ label, to, icon }) => (
                  <button
                    key={to}
                    onClick={() => navigate(to)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm
                      text-ink-mid hover:text-ink hover:bg-parchment-lo transition-all text-left"
                  >
                    <svg className="w-4 h-4 text-ink-ghost shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
                      <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
                    </svg>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Disclaimer */}
            <p className="text-[10px] text-ink-ghost leading-relaxed px-1">
              ⚠ TraceHealth provides educational risk screening only. Results do not
              constitute a medical diagnosis. Always consult a qualified healthcare
              professional.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
