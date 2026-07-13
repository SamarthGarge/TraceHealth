import React, { useState, useRef, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

/**
 * Header — persistent top navigation bar.
 * DataLens §3: parchment background, ink text, terra accent on active items.
 *
 * Shows:
 * - App logo / name (left)
 * - Main nav links (center, hidden on mobile)
 * - Auth state: Login + Signup buttons (unauthenticated) | Avatar dropdown (authenticated)
 */
export default function Header() {
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

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

  async function handleLogout() {
    setDropdownOpen(false);
    await logout();
    navigate("/", { replace: true });
  }

  const navLinks = [
    { to: "/predict/diabetes", label: "Predict" },
    { to: "/insights",        label: "Insights" },
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
    <header className="sticky top-0 z-40 bg-parchment border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">

        {/* Logo */}
        <Link
          to={isAuthenticated ? "/dashboard" : "/"}
          className="flex items-center gap-2 shrink-0"
        >
          <span className="w-6 h-6 rounded bg-terra flex items-center justify-center">
            <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 text-white" fill="currentColor">
              <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zm0 2a5 5 0 1 1 0 10A5 5 0 0 1 8 3zm-.5 2v3.5l2.8 1.6-.5.9L6.5 9V5h1z" />
            </svg>
          </span>
          <span className="font-serif text-lg text-ink leading-none">
            TraceHealth
          </span>
        </Link>

        {/* Center nav — desktop only */}
        <nav className="hidden md:flex items-center gap-1" aria-label="Main navigation">
          {navLinks.map(({ to, label }) => (
            <Link
              key={to}
              to={to}
              className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                isActive(to)
                  ? "bg-terra-dim text-terra font-medium"
                  : "text-ink-mid hover:text-ink hover:bg-parchment-lo"
              }`}
            >
              {label}
            </Link>
          ))}
          {isAuthenticated && (
            <Link
              to="/dashboard"
              className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                isActive("/dashboard")
                  ? "bg-terra-dim text-terra font-medium"
                  : "text-ink-mid hover:text-ink hover:bg-parchment-lo"
              }`}
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
                className="flex items-center gap-2 rounded-full pl-1 pr-2 py-1 hover:bg-parchment-lo transition-colors"
              >
                <span className="w-7 h-7 rounded-full bg-terra text-white text-xs font-semibold flex items-center justify-center">
                  {initials}
                </span>
                <span className="hidden sm:block text-sm text-ink-mid max-w-[120px] truncate">
                  {user.name}
                </span>
                <svg
                  className={`w-3.5 h-3.5 text-ink-ghost transition-transform ${dropdownOpen ? "rotate-180" : ""}`}
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
                  className="absolute right-0 mt-1 w-52 rounded-xl border border-border bg-white shadow-lg py-1 z-50"
                >
                  {/* User info */}
                  <div className="px-4 py-2.5 border-b border-border-soft">
                    <p className="text-sm font-medium text-ink truncate">{user.name}</p>
                    <p className="text-xs text-ink-light truncate">{user.email}</p>
                  </div>

                  <Link
                    to="/dashboard"
                    role="menuitem"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2 text-sm text-ink-mid hover:text-ink hover:bg-parchment transition-colors"
                  >
                    Dashboard
                  </Link>
                  <Link
                    to="/history"
                    role="menuitem"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2 text-sm text-ink-mid hover:text-ink hover:bg-parchment transition-colors"
                  >
                    My History
                  </Link>
                  <Link
                    to="/profile"
                    role="menuitem"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2 text-sm text-ink-mid hover:text-ink hover:bg-parchment transition-colors"
                  >
                    Profile & Settings
                  </Link>

                  {isAdmin && (
                    <Link
                      to="/admin"
                      role="menuitem"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2 text-sm text-ink-mid hover:text-ink hover:bg-parchment transition-colors"
                    >
                      Admin Dashboard
                    </Link>
                  )}

                  <div className="border-t border-border-soft mt-1 pt-1">
                    <button
                      role="menuitem"
                      onClick={handleLogout}
                      className="w-full text-left flex items-center gap-2.5 px-4 py-2 text-sm text-status-high hover:bg-status-high-dim transition-colors"
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
                className="px-3 py-1.5 text-sm text-ink-mid hover:text-ink transition-colors"
              >
                Sign in
              </Link>
              <Link
                to="/signup"
                className="px-3 py-1.5 rounded-lg bg-terra text-white text-sm font-medium hover:bg-terra-dark transition-colors"
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
