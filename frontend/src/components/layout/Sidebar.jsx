import React, { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

/**
 * Sidebar — DataLens dark-ink navigation panel.
 * Visible on authenticated pages (desktop: fixed left rail, mobile: hidden).
 * Disease nav dots use categorical chart colors (--chart-clay, --chart-plum, etc.)
 *
 * Layout:
 *   - App logo / brand
 *   - Primary nav (Dashboard, Predict disease links, History, Uploads, Symptom Check)
 *   - Secondary nav (Insights, Export, Admin if admin role)
 *   - Bottom: Profile link + Sign out
 */

const DISEASE_NAV = [
  { to: "/predict/diabetes",    label: "Diabetes",      dot: "var(--chart-clay)" },
  { to: "/predict/heart",       label: "Heart Disease", dot: "var(--chart-plum)" },
  { to: "/predict/tb",          label: "Tuberculosis",  dot: "var(--chart-slate)" },
  { to: "/predict/cancer",      label: "Lung Cancer",   dot: "var(--chart-gold)" },
];

const PRIMARY_NAV = [
  {
    to: "/dashboard",
    label: "Dashboard",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    to: "/history",
    label: "History",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    to: "/uploads",
    label: "Uploads",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
      </svg>
    ),
  },
  {
    to: "/symptom-check",
    label: "Symptom Check",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
  },
];

const SECONDARY_NAV = [
  {
    to: "/insights",
    label: "Insights",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  {
    to: "/export",
    label: "Export",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
      </svg>
    ),
  },
];

function NavItem({ to, label, icon, collapsed }) {
  return (
    <NavLink
      to={to}
      title={collapsed ? label : undefined}
      className={({ isActive }) =>
        `flex items-center gap-3 py-2 rounded-lg text-sm transition-colors ${
          collapsed ? "px-0 justify-center" : "px-3"
        } ${
          isActive
            ? "bg-white/10 text-white font-medium"
            : "text-ink-ghost hover:text-white hover:bg-white/5"
        }`
      }
    >
      <div className="shrink-0 flex items-center justify-center w-5 h-5">{icon}</div>
      {!collapsed && <span className="truncate">{label}</span>}
    </NavLink>
  );
}

export default function Sidebar() {
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  
  const [collapsed, setCollapsed] = useState(() => {
    return localStorage.getItem("sidebar_collapsed") === "true";
  });

  const toggleSidebar = () => {
    setCollapsed(prev => {
      const next = !prev;
      localStorage.setItem("sidebar_collapsed", next.toString());
      return next;
    });
  };

  async function handleLogout() {
    await logout();
    navigate("/", { replace: true });
  }

  return (
    <aside className={`hidden md:flex flex-col shrink-0 min-h-screen bg-ink py-5 transition-all duration-300 ease-in-out ${collapsed ? "w-16 px-2" : "w-56 px-3"}`}>
      {/* Brand & Toggle */}
      <div className={`flex items-center mb-8 ${collapsed ? "flex-col gap-4 px-1" : "justify-between px-3"}`}>
        <div className={`flex items-center gap-2.5 ${collapsed ? "justify-center" : ""}`}>
          <img
            src="/logo.svg"
            alt="TraceHealth"
            className="w-7 h-7 rounded-md object-contain shrink-0 border border-white/10"
          />
          {!collapsed && <span className="font-serif text-white text-lg leading-none truncate">TraceHealth</span>}
        </div>
        <button 
          onClick={toggleSidebar}
          className="p-1 rounded-md text-ink-ghost hover:text-white hover:bg-white/10 transition-colors"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Primary nav */}
      <nav className="space-y-0.5" aria-label="Primary navigation">
        {PRIMARY_NAV.map((item) => (
          <NavItem key={item.to} {...item} collapsed={collapsed} />
        ))}
      </nav>

      {/* Disease predict links */}
      <div className="mt-6">
        {!collapsed ? (
          <p className="px-3 mb-2 text-[10px] font-mono tracking-widest text-ink-light uppercase truncate">
            Predict
          </p>
        ) : (
          <div className="w-full h-px bg-white/10 mb-2 mt-1" />
        )}
        <div className="space-y-0.5">
          {DISEASE_NAV.map(({ to, label, dot }) => (
            <NavLink
              key={to}
              to={to}
              title={collapsed ? label : undefined}
              className={({ isActive }) =>
                `flex items-center gap-3 py-2 rounded-lg text-sm transition-colors ${
                  collapsed ? "px-0 justify-center" : "px-3"
                } ${
                  isActive
                    ? "bg-white/10 text-white font-medium"
                    : "text-ink-ghost hover:text-white hover:bg-white/5"
                }`
              }
            >
              <div className="shrink-0 flex items-center justify-center w-5 h-5">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: dot }} />
              </div>
              {!collapsed && <span className="truncate">{label}</span>}
            </NavLink>
          ))}
        </div>
      </div>

      {/* Secondary nav */}
      <div className="mt-6 space-y-0.5">
        {!collapsed && <div className="w-full h-px bg-white/10 mb-3" />}
        {SECONDARY_NAV.map((item) => (
          <NavItem key={item.to} {...item} collapsed={collapsed} />
        ))}
        {isAdmin && (
          <NavItem
            to="/admin"
            label="Admin"
            collapsed={collapsed}
            icon={
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            }
          />
        )}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Footer — profile + sign out */}
      <div className="border-t border-white/10 pt-3 space-y-0.5">
        <NavLink
          to="/profile"
          title={collapsed ? (user?.name ?? "Profile") : undefined}
          className={({ isActive }) =>
            `flex items-center gap-3 py-2 rounded-lg text-sm transition-colors ${
              collapsed ? "px-0 justify-center" : "px-3"
            } ${
              isActive
                ? "bg-white/10 text-white"
                : "text-ink-ghost hover:text-white hover:bg-white/5"
            }`
          }
        >
          <div className="shrink-0 flex items-center justify-center w-5 h-5">
            <span className="w-6 h-6 rounded-full bg-terra text-white text-[10px] font-semibold flex items-center justify-center">
              {user?.name
                ? user.name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()
                : "U"}
            </span>
          </div>
          {!collapsed && <span className="truncate">{user?.name ?? "Profile"}</span>}
        </NavLink>

        <button
          onClick={handleLogout}
          title={collapsed ? "Sign out" : undefined}
          className={`w-full flex items-center gap-3 py-2 rounded-lg text-sm text-ink-ghost hover:text-status-high hover:bg-status-high-dim transition-colors ${
            collapsed ? "px-0 justify-center" : "px-3"
          }`}
        >
          <div className="shrink-0 flex items-center justify-center w-5 h-5">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </div>
          {!collapsed && <span>Sign out</span>}
        </button>
      </div>
    </aside>
  );
}
