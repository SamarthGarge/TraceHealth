import React, { useEffect, useState, useCallback } from "react";
import Sidebar from "../components/layout/Sidebar";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import apiClient from "../api/client";

// ── API helpers (inline — no separate file needed for admin) ─────────────────

const api = {
  getStats:           ()           => apiClient.get("/api/admin/stats").then(r => r.data),
  listUsers:          (skip, limit)=> apiClient.get("/api/admin/users", { params: { skip, limit } }).then(r => r.data),
  getRecentPredictions:(skip, limit, disease) =>
    apiClient.get("/api/admin/predictions/recent", { params: { skip, limit, ...(disease ? { disease } : {}) } }).then(r => r.data),
};

// ── Constants ─────────────────────────────────────────────────────────────────

const PAGE_SIZE = 15;

const DISEASE_META = {
  diabetes: { label: "Diabetes",      dot: "var(--chart-clay)"  },
  heart:    { label: "Heart Disease", dot: "var(--chart-plum)"  },
  tb:       { label: "Tuberculosis",  dot: "var(--chart-slate)" },
  cancer:   { label: "Lung Cancer",   dot: "var(--chart-gold)"  },
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

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function fmtPct(val) {
  if (val == null) return "—";
  return `${(val * 100).toFixed(1)}%`;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, accent }) {
  return (
    <div className="bg-white border border-border rounded-xl px-6 py-5">
      <p className="text-xs font-mono tracking-widest text-ink-ghost uppercase mb-2">{label}</p>
      <p className="font-serif text-3xl font-semibold" style={{ color: accent ?? "var(--ink)" }}>
        {value ?? "—"}
      </p>
      {sub && <p className="text-xs text-ink-ghost mt-1">{sub}</p>}
    </div>
  );
}

function SectionHeader({ title, badge }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <h2 className="text-sm font-semibold text-ink">{title}</h2>
      {badge != null && (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-parchment-lo border border-border text-ink-ghost">
          {badge}
        </span>
      )}
    </div>
  );
}

function Pagination({ skip, total, limit, onPage }) {
  const hasPrev = skip > 0;
  const hasNext = skip + limit < total;
  if (!hasPrev && !hasNext) return null;
  return (
    <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
      <button disabled={!hasPrev} onClick={() => onPage(skip - limit)}
        className="px-3 py-1.5 rounded-lg text-xs border border-border text-ink-mid disabled:opacity-40 hover:border-border-strong transition-colors">
        ← Prev
      </button>
      <span className="text-xs text-ink-ghost font-mono">
        {skip + 1}–{Math.min(skip + limit, total)} of {total}
      </span>
      <button disabled={!hasNext} onClick={() => onPage(skip + limit)}
        className="px-3 py-1.5 rounded-lg text-xs border border-border text-ink-mid disabled:opacity-40 hover:border-border-strong transition-colors">
        Next →
      </button>
    </div>
  );
}

// ── Tabs ──────────────────────────────────────────────────────────────────────

const TABS = ["Overview", "Users", "Predictions"];

// ── Main Component ────────────────────────────────────────────────────────────

export default function Admin() {
  const { isAdmin, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [tab, setTab]         = useState("Overview");
  const [stats, setStats]     = useState(null);
  const [statsErr, setStatsErr] = useState("");

  // Users table
  const [users, setUsers]       = useState([]);
  const [userTotal, setUserTotal] = useState(0);
  const [userSkip, setUserSkip] = useState(0);
  const [usersLoading, setUsersLoading] = useState(false);

  // Predictions table
  const [preds, setPreds]         = useState([]);
  const [predTotal, setPredTotal] = useState(0);
  const [predSkip, setPredSkip]   = useState(0);
  const [predDisease, setPredDisease] = useState("");
  const [predsLoading, setPredsLoading] = useState(false);

  // Guard — redirect non-admins
  useEffect(() => {
    if (!authLoading && !isAdmin) navigate("/dashboard", { replace: true });
  }, [authLoading, isAdmin, navigate]);

  // Load stats
  useEffect(() => {
    if (!isAdmin) return;
    api.getStats()
      .then(setStats)
      .catch(() => setStatsErr("Failed to load stats."));
  }, [isAdmin]);

  // Load users
  const loadUsers = useCallback(async (skip = 0) => {
    setUsersLoading(true);
    try {
      const d = await api.listUsers(skip, PAGE_SIZE);
      setUsers(d.items);
      setUserTotal(d.total);
      setUserSkip(skip);
    } finally {
      setUsersLoading(false);
    }
  }, []);

  // Load predictions
  const loadPreds = useCallback(async (skip = 0, disease = "") => {
    setPredsLoading(true);
    try {
      const d = await api.getRecentPredictions(skip, PAGE_SIZE, disease);
      setPreds(d.items);
      setPredTotal(d.total);
      setPredSkip(skip);
    } finally {
      setPredsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab === "Users" && users.length === 0)       loadUsers(0);
    if (tab === "Predictions" && preds.length === 0) loadPreds(0, predDisease);
  }, [tab]);

  if (authLoading) return null;
  if (!isAdmin) return null;

  return (
    <div className="page-shell">
      <Sidebar />

      <main className="page-main bg-parchment">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Header */}
        <header className="mb-6 sm:mb-8 animate-fade-up">
          <p className="text-[10px] font-mono tracking-widest text-ink-ghost uppercase mb-1">System</p>
          <h1 className="font-display text-2xl sm:text-3xl font-semibold text-ink">Admin Panel</h1>
          <p className="text-ink-light text-sm mt-1">Platform management — visible to admins only.</p>
        </header>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 sm:mb-8 bg-white border border-border rounded-xl p-1 w-fit overflow-x-auto scrollbar-hide animate-fade-up" style={{ animationDelay: "50ms" }}>
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all shrink-0 active:scale-[0.97] ${
                tab === t
                  ? "bg-terra text-white shadow-sm shadow-terra/20"
                  : "text-ink-mid hover:text-ink hover:bg-parchment-lo"
              }`}
              style={{ transitionTimingFunction: "cubic-bezier(0.23, 1, 0.32, 1)", transitionDuration: "200ms" }}
            >
              {t}
            </button>
          ))}
        </div>

        {/* ── Overview Tab ──────────────────────────────────────────────────── */}
        {tab === "Overview" && (
          <div className="space-y-8">
            {statsErr && (
              <div className="p-4 rounded-lg border border-status-high bg-status-high-dim text-status-high text-sm">
                {statsErr}
              </div>
            )}

            {/* User stats */}
            <div>
              <SectionHeader title="Users" />
              <div className="grid grid-cols-3 gap-4">
                <StatCard label="Total users"    value={stats?.users?.total}     sub="Registered accounts" />
                <StatCard label="Consented"      value={stats?.users?.consented} sub="Opted in to data storage" accent="var(--status-low)" />
                <StatCard label="Admins"         value={stats?.users?.admins}    sub="Admin role holders" accent="var(--terra)" />
              </div>
            </div>

            {/* Prediction stats */}
            <div>
              <SectionHeader title="Predictions" />
              <div className="grid grid-cols-4 gap-4 mb-4">
                <StatCard label="Total" value={stats?.predictions?.total} sub="All-time screenings" />
                {Object.entries(stats?.predictions?.by_risk ?? {}).map(([level, count]) => (
                  <StatCard
                    key={level}
                    label={`${level} risk`}
                    value={count}
                    accent={RISK_COLOR[level]}
                  />
                ))}
              </div>

              {/* Per-disease counts */}
              <div className="bg-white border border-border rounded-xl p-5">
                <p className="text-xs font-mono text-ink-ghost uppercase tracking-widest mb-4">By disease</p>
                <div className="space-y-3">
                  {Object.entries(stats?.predictions?.by_disease ?? {}).map(([key, count]) => {
                    const total = stats?.predictions?.total || 1;
                    const pct = Math.round((count / total) * 100);
                    const dm = DISEASE_META[key] ?? {};
                    return (
                      <div key={key} className="flex items-center gap-4">
                        <div className="flex items-center gap-2 w-32 shrink-0">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: dm.dot ?? "var(--ink-ghost)" }} />
                          <span className="text-xs text-ink-mid">{dm.label ?? key}</span>
                        </div>
                        <div className="flex-1 rounded-full overflow-hidden" style={{ height: 6, backgroundColor: "var(--border-soft)" }}>
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: dm.dot ?? "var(--ink-ghost)" }} />
                        </div>
                        <span className="text-xs font-mono text-ink-ghost w-16 text-right shrink-0">
                          {count} ({pct}%)
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Upload stats */}
            <div>
              <SectionHeader title="Uploads" />
              <div className="grid grid-cols-3 gap-4">
                <StatCard label="Total files" value={stats?.uploads?.total} sub="Stored in GridFS" />
              </div>
            </div>

            {stats?.generated_at && (
              <p className="text-[10px] text-ink-ghost font-mono">
                Stats generated at {new Date(stats.generated_at).toLocaleTimeString("en-IN")}
              </p>
            )}
          </div>
        )}

        {/* ── Users Tab ────────────────────────────────────────────────────── */}
        {tab === "Users" && (
          <div>
            <SectionHeader title="All users" badge={userTotal} />
            <div className="bg-white border border-border rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-parchment-lo">
                    <th className="text-left px-5 py-3 text-xs font-mono text-ink-ghost">Name</th>
                    <th className="text-left px-5 py-3 text-xs font-mono text-ink-ghost">Email</th>
                    <th className="text-left px-5 py-3 text-xs font-mono text-ink-ghost">Provider</th>
                    <th className="text-left px-5 py-3 text-xs font-mono text-ink-ghost">Role</th>
                    <th className="text-left px-5 py-3 text-xs font-mono text-ink-ghost">Consent</th>
                    <th className="text-left px-5 py-3 text-xs font-mono text-ink-ghost">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {usersLoading && (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-sm text-ink-ghost">
                        <div className="inline-flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-terra border-t-transparent rounded-full animate-spin" />
                          Loading…
                        </div>
                      </td>
                    </tr>
                  )}
                  {!usersLoading && users.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-sm text-ink-ghost">No users found.</td>
                    </tr>
                  )}
                  {users.map((u) => (
                    <tr key={u.id} className="border-b border-border last:border-0 hover:bg-parchment-lo transition-colors">
                      <td className="px-5 py-3 font-medium text-ink">{u.name || "—"}</td>
                      <td className="px-5 py-3 text-ink-mid">{u.email}</td>
                      <td className="px-5 py-3 text-xs font-mono text-ink-ghost">{u.auth_provider}</td>
                      <td className="px-5 py-3">
                        <span
                          className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
                          style={{
                            color: u.role === "admin" ? "var(--terra)" : "var(--ink-ghost)",
                            backgroundColor: u.role === "admin" ? "var(--terra-dim)" : "var(--border-soft)",
                          }}
                        >
                          {u.role}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className="w-2 h-2 rounded-full inline-block"
                          style={{ backgroundColor: u.consentDataStorage ? "var(--status-low)" : "var(--border-strong)" }}
                          title={u.consentDataStorage ? "Consented" : "Not consented"}
                        />
                      </td>
                      <td className="px-5 py-3 text-xs text-ink-ghost">{fmtDate(u.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination skip={userSkip} total={userTotal} limit={PAGE_SIZE} onPage={loadUsers} />
          </div>
        )}

        {/* ── Predictions Tab ───────────────────────────────────────────────── */}
        {tab === "Predictions" && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <SectionHeader title="Recent predictions" badge={predTotal} />
              <select
                value={predDisease}
                onChange={(e) => { setPredDisease(e.target.value); loadPreds(0, e.target.value); }}
                className="px-3 py-1.5 rounded-lg border border-border bg-white text-xs text-ink-mid
                  focus:outline-none focus:ring-2 focus:ring-terra"
              >
                <option value="">All diseases</option>
                {Object.entries(DISEASE_META).map(([k, d]) => (
                  <option key={k} value={k}>{d.label}</option>
                ))}
              </select>
            </div>

            <div className="bg-white border border-border rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-parchment-lo">
                    <th className="text-left px-5 py-3 text-xs font-mono text-ink-ghost">Disease</th>
                    <th className="text-left px-5 py-3 text-xs font-mono text-ink-ghost">User ID</th>
                    <th className="text-left px-5 py-3 text-xs font-mono text-ink-ghost">Risk</th>
                    <th className="text-left px-5 py-3 text-xs font-mono text-ink-ghost">Probability</th>
                    <th className="text-left px-5 py-3 text-xs font-mono text-ink-ghost">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {predsLoading && (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-sm text-ink-ghost">
                        <div className="inline-flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-terra border-t-transparent rounded-full animate-spin" />
                          Loading…
                        </div>
                      </td>
                    </tr>
                  )}
                  {!predsLoading && preds.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-sm text-ink-ghost">No predictions found.</td>
                    </tr>
                  )}
                  {preds.map((p) => {
                    const dm = DISEASE_META[p.disease] ?? {};
                    return (
                      <tr key={p.id} className="border-b border-border last:border-0 hover:bg-parchment-lo transition-colors">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: dm.dot ?? "var(--ink-ghost)" }} />
                            <span className="text-ink">{dm.label ?? p.disease}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3 font-mono text-xs text-ink-ghost truncate max-w-[120px]">{p.user_id}</td>
                        <td className="px-5 py-3">
                          <span
                            className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
                            style={{ color: RISK_COLOR[p.ensemble_risk_level], backgroundColor: RISK_BG[p.ensemble_risk_level] }}
                          >
                            {p.ensemble_risk_level}
                          </span>
                        </td>
                        <td className="px-5 py-3 font-mono text-xs">{fmtPct(p.ensemble_probability)}</td>
                        <td className="px-5 py-3 text-xs text-ink-ghost">{fmtDate(p.created_at)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <Pagination skip={predSkip} total={predTotal} limit={PAGE_SIZE} onPage={(s) => loadPreds(s, predDisease)} />
          </div>
        )}
        </div>
      </main>
    </div>
  );
}
