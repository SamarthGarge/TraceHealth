import React, { useState, useRef, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Menu } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useDrawer } from "./Sidebar";

/**
 * Header — persistent top navigation bar.
 * Desktop: full nav bar with links + avatar dropdown.
 * Mobile: slim bar with hamburger (opens Sidebar drawer) + avatar.
 */

const EASE = "cubic-bezier(0.23, 1, 0.32, 1)";

export default function Header() {
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { setOpen: setDrawerOpen } = useDrawer();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Close dropdown on route change
  useEffect(() => { setDropdownOpen(false); }, [location.pathname]);

  async function handleLogout() {
    setDropdownOpen(false);
    await logout();
    navigate("/", { replace: true });
  }

  const navLinks = [
    { to: "/predict/diabetes", label: "Predict" },
    { to: "/resources",        label: "Resources" },
    { to: "/about-models",     label: "About Models" },
    { to: "/symptom-check",   label: "Symptom Check" },
  ];

  const isActive = (path) =>
    location.pathname === path || location.pathname.startsWith(path + "/");

  // Initials avatar from user name
  const initials = user?.name
    ? user.name
        .split(" ")
        .map((w) => w[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "U";

  return (
    <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-border-soft">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">

        {/* Left: Hamburger (mobile) + Logo */}
        <div className="flex items-center gap-3">
          {/* Mobile hamburger — opens sidebar drawer */}
          {isAuthenticated && (
            <button
              onClick={() => setDrawerOpen(true)}
              className="md:hidden p-1.5 -ml-1 rounded-lg text-ink-mid hover:text-ink hover:bg-parchment-lo transition-all active:scale-[0.92]"
              style={{ transitionTimingFunction: EASE, transitionDuration: "200ms" }}
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          <Link
            to={isAuthenticated ? "/dashboard" : "/"}
            className="flex items-center gap-2 shrink-0 group"
          >
            <img
              src="/new_logo.svg"
              alt="TraceHealth"
              className="w-7 h-7 rounded-lg object-contain border border-border-soft group-hover:border-border-strong transition-colors"
              style={{ transitionTimingFunction: EASE, transitionDuration: "200ms" }}
            />
            <span className="font-serif text-lg text-ink leading-none hidden sm:block">
              TraceHealth
            </span>
          </Link>
        </div>

        {/* Center nav — desktop only */}
        <nav className="hidden md:flex items-center gap-1" aria-label="Main navigation">
          {navLinks.map(({ to, label }) => (
            <Link
              key={to}
              to={to}
              className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
                isActive(to)
                  ? "bg-terra-dim text-terra font-medium"
                  : "text-ink-mid hover:text-ink hover:bg-parchment-lo"
              }`}
              style={{ transitionTimingFunction: EASE, transitionDuration: "200ms" }}
            >
              {label}
            </Link>
          ))}
          {isAuthenticated && (
            <Link
              to="/dashboard"
              className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
                isActive("/dashboard")
                  ? "bg-terra-dim text-terra font-medium"
                  : "text-ink-mid hover:text-ink hover:bg-parchment-lo"
              }`}
              style={{ transitionTimingFunction: EASE, transitionDuration: "200ms" }}
            >
              Dashboard
            </Link>
          )}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-2 shrink-0">
          {isAuthenticated ? (
            /* Avatar dropdown */
            <div className="relative" ref={dropdownRef}>
              <button
                id="header-user-menu"
                aria-haspopup="true"
                aria-expanded={dropdownOpen}
                onClick={() => setDropdownOpen((o) => !o)}
                className="flex items-center gap-2 rounded-full pl-1 pr-2 py-1 hover:bg-parchment-lo transition-all active:scale-[0.97]"
                style={{ transitionTimingFunction: EASE, transitionDuration: "200ms" }}
              >
                <span className="w-7 h-7 rounded-full bg-terra text-white text-xs font-semibold flex items-center justify-center">
                  {initials}
                </span>
                <span className="hidden sm:block text-sm text-ink-mid max-w-[120px] truncate">
                  {user.name}
                </span>
                <svg
                  className={`w-3.5 h-3.5 text-ink-ghost transition-transform`}
                  style={{
                    transitionTimingFunction: EASE,
                    transitionDuration: "200ms",
                    transform: dropdownOpen ? "rotate(180deg)" : "rotate(0deg)",
                  }}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Dropdown menu */}
              {dropdownOpen && (
                <div
                  role="menu"
                  aria-labelledby="header-user-menu"
                  className="absolute right-0 mt-1.5 w-52 rounded-xl border border-border bg-white shadow-lg py-1 z-50 animate-scale-in"
                  style={{ transformOrigin: "top right" }}
                >
                  {/* User info */}
                  <div className="px-4 py-2.5 border-b border-border-soft">
                    <p className="text-sm font-medium text-ink truncate">{user.name}</p>
                    <p className="text-xs text-ink-light truncate">{user.email}</p>
                  </div>

                  {[
                    { to: "/dashboard", label: "Dashboard" },
                    { to: "/history", label: "My History" },
                    { to: "/profile", label: "Profile & Settings" },
                    ...(isAdmin ? [{ to: "/admin", label: "Admin Dashboard" }] : []),
                  ].map(({ to, label }) => (
                    <Link
                      key={to}
                      to={to}
                      role="menuitem"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2 text-sm text-ink-mid hover:text-ink hover:bg-parchment transition-all"
                      style={{ transitionTimingFunction: EASE, transitionDuration: "150ms" }}
                    >
                      {label}
                    </Link>
                  ))}

                  <div className="border-t border-border-soft mt-1 pt-1">
                    <button
                      role="menuitem"
                      onClick={handleLogout}
                      className="w-full text-left flex items-center gap-2.5 px-4 py-2 text-sm text-status-high hover:bg-status-high-dim transition-all active:scale-[0.97]"
                      style={{ transitionTimingFunction: EASE, transitionDuration: "150ms" }}
                    >
                      Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Unauthenticated buttons */
            <>
              <Link
                to="/login"
                className="px-3 py-1.5 text-sm text-ink-mid hover:text-ink transition-all"
                style={{ transitionTimingFunction: EASE, transitionDuration: "200ms" }}
              >
                Sign in
              </Link>
              <Link
                to="/signup"
                className="px-4 py-2 rounded-full bg-terra text-white text-sm font-medium hover:bg-terra-dark shadow-sm shadow-terra/20 hover:shadow-md hover:shadow-terra/25 transition-all active:scale-[0.97]"
                style={{ transitionTimingFunction: EASE, transitionDuration: "200ms" }}
              >
                Get started
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
