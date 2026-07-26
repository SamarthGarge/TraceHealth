import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { login, loginWithGoogle } from "../api/auth";
import { useAuth } from "../context/AuthContext";
import { loginSchema } from "../utils/validation";

/**
 * Login page — DataLens auth split-panel layout (UI Design System §14).
 * Left panel: branding + editorial headline.
 * Right panel: email/password form + Google OAuth.
 */
export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setUser } = useAuth();
  const from = location.state?.from?.pathname || "/dashboard";

  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: zodResolver(loginSchema) });

  async function onSubmit(data) {
    setIsLoading(true);
    setServerError("");
    try {
      const result = await login({ email: data.email, password: data.password });
      setUser(result.user); // update AuthContext without a page reload
      navigate(from, { replace: true });
    } catch (err) {
      const msg = err.response?.data?.detail || "Invalid email or password. Please try again.";
      setServerError(msg);
    } finally {
      setIsLoading(false);
    }
  }

  function handleGoogle() {
    loginWithGoogle(); // plain window.location redirect to /api/auth/google
  }

  return (
    <div className="auth-layout">
      {/* ── Left brand panel ───────────────────────────────────────────── */}
      <div className="auth-brand-panel">
        <div className="mb-8">
          <p className="font-mono text-xs tracking-widest text-ink-light uppercase mb-6">
            TraceHealth
          </p>
          <h1 className="font-display text-5xl font-semibold leading-tight text-ink mb-6">
            Understand your<br />
            health risk,<br />
            <em>transparently.</em>
          </h1>
          <p className="text-ink-mid text-base leading-relaxed max-w-sm">
            Explainable ML-powered screening for four conditions — every
            prediction shows exactly which factors drive the result.
          </p>
        </div>

        {/* Feature pill list */}
        <div className="flex flex-col gap-3 mb-10">
          {[
            "SHAP Explainability",
            "Multi-Model Comparison",
            "Personal Risk History",
            "Private by Design",
          ].map((feature) => (
            <div key={feature} className="flex items-center gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-terra flex-shrink-0" />
              <span className="text-ink-mid text-sm font-medium">{feature}</span>
            </div>
          ))}
        </div>

        {/* Stat row */}
        <div className="flex gap-8 pt-6 border-t border-border-soft">
          {[
            { num: "4", label: "Diseases" },
            { num: "3", label: "Models / Disease" },
            { num: "100%", label: "Explainable" },
          ].map(({ num, label }) => (
            <div key={label}>
              <div className="font-display text-3xl font-semibold text-ink">
                {num}
              </div>
              <div className="font-mono text-xs text-ink-light uppercase tracking-wider">
                {label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right form panel ───────────────────────────────────────────── */}
      <div className="auth-form-panel">
        <div className="w-full" style={{ maxWidth: 380 }}>
          <h2 className="text-2xl font-semibold text-ink mb-1">Welcome back</h2>
          <p className="text-ink-light text-sm mb-8">
            Don't have an account?{" "}
            <Link to="/signup" className="text-terra font-medium hover:text-terra-dark transition-colors">
              Sign up
            </Link>
          </p>

          {/* Google OAuth */}
          <button
            onClick={handleGoogle}
            className="w-full btn btn-secondary mb-4 gap-3"
          >
            <GoogleIcon />
            Continue with Google
          </button>

          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-border-soft" />
            <span className="text-xs text-ink-ghost font-mono">or</span>
            <div className="flex-1 h-px bg-border-soft" />
          </div>

          {/* Email/password form */}
          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            {serverError && (
              <div className="error-box mb-4" role="alert">
                {serverError}
              </div>
            )}

            <div className="mb-4">
              <label className="input-label" htmlFor="login-email">
                Email
              </label>
              <input
                id="login-email"
                type="email"
                autoComplete="email"
                className="input"
                placeholder="you@example.com"
                {...register("email")}
              />
              {errors.email && (
                <p className="text-status-high text-xs mt-1">{errors.email.message}</p>
              )}
            </div>

            <div className="mb-6">
              <label className="input-label" htmlFor="login-password">
                Password
              </label>
              <input
                id="login-password"
                type="password"
                autoComplete="current-password"
                className="input"
                placeholder="••••••••"
                {...register("password")}
              />
              {errors.password && (
                <p className="text-status-high text-xs mt-1">{errors.password.message}</p>
              )}
            </div>

            <button
              type="submit"
              className="btn btn-primary w-full"
              disabled={isLoading}
            >
              {isLoading ? <span className="spinner" style={{ width: 16, height: 16 }} /> : "Sign in"}
            </button>
          </form>

          <p className="text-center text-xs text-ink-ghost mt-6">
            Authorized personnel only?{" "}
            <Link to="/admin/login" className="text-terra hover:underline">
              Admin sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  );
}
