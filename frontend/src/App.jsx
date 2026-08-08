import React, { Suspense, lazy } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import AuthGuard from "./components/layout/AuthGuard";

// Eager-loaded pages (auth, landing — small, always needed)
import Landing     from "./pages/Landing";
import Login       from "./pages/Login";
import Signup      from "./pages/Signup";
import AdminLogin  from "./pages/AdminLogin";
import OAuthCallback from "./pages/OAuthCallback";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword  from "./pages/ResetPassword";
import NotFound    from "./pages/NotFound";

// Lazy-loaded pages (code-split by route for performance)
const Dashboard     = lazy(() => import("./pages/Dashboard"));
const Predict       = lazy(() => import("./pages/Predict"));
const History       = lazy(() => import("./pages/History"));
const HistoryDetail = lazy(() => import("./pages/HistoryDetail"));
const Uploads       = lazy(() => import("./pages/Uploads"));
const Export        = lazy(() => import("./pages/Export"));
const Resources     = lazy(() => import("./pages/Resources"));
const AboutModels   = lazy(() => import("./pages/AboutModels"));
const Profile       = lazy(() => import("./pages/Profile"));
const Admin         = lazy(() => import("./pages/Admin"));
const SymptomCheck  = lazy(() => import("./pages/SymptomCheck"));

// Page-level loading fallback
function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-parchment">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-terra border-t-transparent rounded-full animate-spin" />
        <p className="text-ink-light font-mono text-sm">Loading…</p>
      </div>
    </div>
  );
}

/**
 * Route definitions — all 27 routes from Screen Inventory v2.0.
 * AuthGuard wraps all routes that require authentication.
 * Public routes (Landing, Login, Signup, Resources, AboutModels) are accessible without auth.
 */
export default function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* ── Public ──────────────────────────────────────────────── */}
        <Route path="/"                element={<Landing />} />
        <Route path="/login"           element={<Login />} />
        <Route path="/signup"          element={<Signup />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password"  element={<ResetPassword />} />
        <Route path="/admin/login"     element={<AdminLogin />} />
        <Route path="/auth/callback"   element={<OAuthCallback />} />
        <Route path="/resources"           element={<Resources />} />
        <Route path="/about-models"         element={<AboutModels />} />

        {/* Guest + Auth — predictions and symptom check work for everyone */}
        <Route path="/predict"           element={<Predict />} />
        <Route path="/predict/:disease"  element={<Predict />} />
        <Route path="/symptom-check"     element={<SymptomCheck />} />

        {/* ── Authenticated ────────────────────────────────────────── */}
        <Route element={<AuthGuard />}>
          <Route path="/dashboard"        element={<Dashboard />} />
          <Route path="/history"           element={<History />} />
          <Route path="/history/:id"        element={<HistoryDetail />} />
          <Route path="/uploads"             element={<Uploads />} />
          <Route path="/export"               element={<Export />} />
          <Route path="/profile"               element={<Profile />} />
        </Route>

        {/* ── Admin (Auth + admin role — returns 404 for non-admins) ── */}
        <Route element={<AuthGuard requireAdmin />}>
          <Route path="/admin" element={<Admin />} />
        </Route>

        {/* ── System ───────────────────────────────────────────────── */}
        <Route path="/404"  element={<NotFound />} />
        <Route path="*"     element={<Navigate to="/404" replace />} />
      </Routes>
    </Suspense>
  );
}
