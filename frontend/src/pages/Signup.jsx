import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signup, loginWithGoogle } from "../api/auth";
import { useAuth } from "../context/AuthContext";
import { signupSchema } from "../utils/validation";

/**
 * Signup page — mirrors Login layout (split-panel DataLens §14).
 * Includes: name, email, password, confirm-password, data-consent checkbox.
 * Consent checkbox is required — form is blocked until checked.
 */
export default function Signup() {
  const navigate = useNavigate();
  const { setUser } = useAuth();

  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm({ resolver: zodResolver(signupSchema) });

  async function onSubmit(data) {
    setIsLoading(true);
    setServerError("");
    try {
      const result = await signup({
        name: data.name,
        email: data.email,
        password: data.password,
        consentDataStorage: data.consentDataStorage,
      });
      setUser(result.user);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      const msg =
        err.response?.data?.detail ||
        "Could not create account. Please try again.";
      setServerError(msg);
    } finally {
      setIsLoading(false);
    }
  }

  function handleGoogle() {
    loginWithGoogle();
  }

  return (
    <div className="auth-layout">
      {/* ── Left brand panel ─────────────────────────────────────────── */}
      <div className="auth-brand-panel">
        <div className="mb-8">
          <p className="font-mono text-xs tracking-widest text-ink-light uppercase mb-6">
            TraceHealth
          </p>
          <h1 className="font-serif text-4xl leading-snug text-ink mb-4">
            Begin your
            <br />
            <em>health journey.</em>
          </h1>
          <p className="text-ink-mid text-sm leading-relaxed max-w-xs">
            Create a free account to track disease risk over time and gain
            AI-powered insights from your health data.
          </p>
        </div>

        <div className="mt-auto space-y-3">
          {[
            { dot: "chart-clay", label: "Diabetes risk screening" },
            { dot: "chart-plum", label: "Heart disease assessment" },
            { dot: "chart-slate", label: "Tuberculosis symptom check" },
            { dot: "chart-gold", label: "Lung cancer risk analysis" },
          ].map(({ dot, label }) => (
            <div key={label} className="flex items-center gap-3">
              <span className={`w-2 h-2 rounded-full bg-[var(--${dot})]`} />
              <span className="text-xs text-ink-light">{label}</span>
            </div>
          ))}
        </div>

        <p className="mt-8 text-[10px] font-mono text-ink-ghost leading-relaxed">
          EDUCATIONAL TOOL ONLY — NOT A MEDICAL DIAGNOSIS
        </p>
      </div>

      {/* ── Right form panel ─────────────────────────────────────────── */}
      <div className="auth-form-panel">
        <div className="w-full max-w-sm mx-auto">
          <h2 className="font-serif text-2xl text-ink mb-1">Create account</h2>
          <p className="text-ink-light text-sm mb-8">
            Already have one?{" "}
            <Link to="/login" className="text-terra hover:underline">
              Sign in
            </Link>
          </p>

          {/* Google button */}
          <button
            type="button"
            onClick={handleGoogle}
            className="w-full flex items-center justify-center gap-3 border border-border rounded-lg py-2.5 px-4 text-sm text-ink-mid hover:bg-parchment-lo transition-colors mb-6"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4" aria-hidden="true">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Continue with Google
          </button>

          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-ink-ghost font-mono">OR</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
            {/* Name */}
            <div>
              <label htmlFor="name" className="auth-label">
                Full name
              </label>
              <input
                id="name"
                type="text"
                autoComplete="name"
                className={`auth-input ${errors.name ? "border-status-high" : ""}`}
                placeholder="Jane Smith"
                {...register("name")}
              />
              {errors.name && (
                <p className="auth-error">{errors.name.message}</p>
              )}
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="auth-label">
                Email address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                className={`auth-input ${errors.email ? "border-status-high" : ""}`}
                placeholder="jane@example.com"
                {...register("email")}
              />
              {errors.email && (
                <p className="auth-error">{errors.email.message}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="auth-label">
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="new-password"
                className={`auth-input ${errors.password ? "border-status-high" : ""}`}
                placeholder="Min. 8 chars, 1 uppercase, 1 number"
                {...register("password")}
              />
              {errors.password && (
                <p className="auth-error">{errors.password.message}</p>
              )}
            </div>

            {/* Confirm password */}
            <div>
              <label htmlFor="confirmPassword" className="auth-label">
                Confirm password
              </label>
              <input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                className={`auth-input ${errors.confirmPassword ? "border-status-high" : ""}`}
                placeholder="Repeat your password"
                {...register("confirmPassword")}
              />
              {errors.confirmPassword && (
                <p className="auth-error">{errors.confirmPassword.message}</p>
              )}
            </div>

            {/* Consent checkbox — required, blocks submit */}
            <div className="rounded-lg border border-border bg-parchment-lo p-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  id="consentDataStorage"
                  type="checkbox"
                  className="mt-0.5 w-4 h-4 rounded border-border text-terra focus:ring-terra"
                  {...register("consentDataStorage")}
                />
                <span className="text-xs text-ink-mid leading-relaxed">
                  I consent to TraceHealth storing my health assessment data for
                  trend analysis. Data is used solely to display my history and
                  is never sold.{" "}
                  <span className="text-terra font-medium">Required.</span>
                </span>
              </label>
              {errors.consentDataStorage && (
                <p className="auth-error mt-2">
                  {errors.consentDataStorage.message}
                </p>
              )}
            </div>

            {/* Server error */}
            {serverError && (
              <div
                role="alert"
                className="rounded-lg bg-status-high-dim border border-status-high/20 px-4 py-3 text-sm text-status-high"
              >
                {serverError}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 rounded-lg bg-terra text-white text-sm font-medium
                         hover:bg-terra-dark transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isLoading ? "Creating account…" : "Create account"}
            </button>
          </form>

          <p className="mt-6 text-[10px] text-ink-ghost font-mono leading-relaxed text-center">
            By creating an account you agree this tool is for educational use
            only and does not constitute medical advice.
          </p>
        </div>
      </div>
    </div>
  );
}
