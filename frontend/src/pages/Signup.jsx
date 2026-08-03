import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signup, loginWithGoogle } from "../api/auth";
import { useAuth } from "../context/AuthContext";
import { signupSchema } from "../utils/validation";

/**
 * Signup page — editorial split-panel auth layout (mirrors Login).
 * Left: brand + disease screening list. Right: form.
 * Responsive: brand panel hidden on mobile, form centers.
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

  const pw = watch("password", "");
  const strength = getPasswordStrength(pw);

  return (
    <div className="auth-layout">
      {/* ── Left brand panel ─────────────────────────────────────────── */}
      <div className="auth-brand-panel">
        <div className="mb-8 animate-fade-up">
          <div className="flex items-center gap-2.5 mb-8">
            <img src="/new_logo.svg" alt="" className="w-8 h-8 rounded-lg border border-border-soft" />
            <span className="font-serif text-lg text-ink">TraceHealth</span>
          </div>
          <h1 className="font-display text-4xl sm:text-5xl font-semibold leading-tight text-ink mb-4 text-balance">
            Begin your health journey.
          </h1>
          <p className="text-ink-mid text-sm leading-relaxed max-w-xs">
            Create a free account to track disease risk over time and gain
            AI-powered insights from your health data.
          </p>
        </div>

        <div className="mt-auto space-y-3 animate-fade-up stagger-2">
          {[
            { dot: "#C25539", label: "Diabetes risk screening" },
            { dot: "#8B5D6B", label: "Heart disease assessment" },
            { dot: "#5B7C99", label: "Tuberculosis symptom check" },
            { dot: "#A68A4E", label: "Lung cancer risk analysis" },
          ].map(({ dot, label }) => (
            <div key={label} className="flex items-center gap-3">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: dot }} />
              <span className="text-xs text-ink-light">{label}</span>
            </div>
          ))}
        </div>

        <p className="mt-8 text-[10px] font-mono text-ink-ghost leading-relaxed animate-fade-up stagger-3">
          EDUCATIONAL TOOL ONLY — NOT A MEDICAL DIAGNOSIS
        </p>
      </div>

      {/* ── Right form panel ─────────────────────────────────────────── */}
      <div className="auth-form-panel">
        <div className="w-full max-w-sm mx-auto animate-fade-up">
          {/* Mobile-only logo */}
          <div className="flex items-center gap-2.5 mb-6 md:hidden">
            <img src="/new_logo.svg" alt="" className="w-7 h-7 rounded-lg border border-border-soft" />
            <span className="font-serif text-lg text-ink">TraceHealth</span>
          </div>

          <h2 className="text-2xl font-semibold text-ink mb-1">Create account</h2>
          <p className="text-ink-light text-sm mb-8">
            Already have one?{" "}
            <Link to="/login" className="text-terra font-medium hover:text-terra-dark transition-colors">
              Sign in
            </Link>
          </p>

          {/* Google button */}
          <button
            type="button"
            onClick={handleGoogle}
            className="w-full flex items-center justify-center gap-3 border border-border rounded-lg py-2.5 px-4 text-sm text-ink-mid hover:bg-parchment-lo transition-all active:scale-[0.97]"
            style={{ transitionTimingFunction: "cubic-bezier(0.23, 1, 0.32, 1)" }}
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4" aria-hidden="true">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Continue with Google
          </button>

          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-ink-ghost font-mono">OR</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
            {/* Name */}
            <div>
              <label htmlFor="name" className="input-label">Full name</label>
              <input
                id="name"
                type="text"
                autoComplete="name"
                className={`input ${errors.name ? "border-status-high" : ""}`}
                placeholder="Jane Smith"
                {...register("name")}
              />
              {errors.name && <p className="text-status-high text-xs mt-1.5">{errors.name.message}</p>}
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="input-label">Email address</label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                className={`input ${errors.email ? "border-status-high" : ""}`}
                placeholder="jane@example.com"
                {...register("email")}
              />
              {errors.email && <p className="text-status-high text-xs mt-1.5">{errors.email.message}</p>}
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="input-label">Password</label>
              <input
                id="password"
                type="password"
                autoComplete="new-password"
                className={`input ${errors.password ? "border-status-high" : ""}`}
                placeholder="Min. 8 chars, 1 uppercase, 1 number"
                {...register("password")}
              />
              {/* Password strength bar */}
              {pw.length > 0 && (
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex-1 h-1 bg-border-soft rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${strength.percent}%`,
                        backgroundColor: strength.color,
                        transitionTimingFunction: "cubic-bezier(0.23, 1, 0.32, 1)",
                        transitionDuration: "300ms",
                      }}
                    />
                  </div>
                  <span className="text-[10px] font-mono" style={{ color: strength.color }}>
                    {strength.label}
                  </span>
                </div>
              )}
              {errors.password && <p className="text-status-high text-xs mt-1.5">{errors.password.message}</p>}
            </div>

            {/* Confirm password */}
            <div>
              <label htmlFor="confirmPassword" className="input-label">Confirm password</label>
              <input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                className={`input ${errors.confirmPassword ? "border-status-high" : ""}`}
                placeholder="Repeat your password"
                {...register("confirmPassword")}
              />
              {errors.confirmPassword && <p className="text-status-high text-xs mt-1.5">{errors.confirmPassword.message}</p>}
            </div>

            {/* Consent checkbox */}
            <div className="rounded-xl border border-border bg-parchment-lo/50 p-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  id="consentDataStorage"
                  type="checkbox"
                  className="mt-0.5 w-4 h-4 rounded border-border text-terra focus:ring-terra accent-terra"
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
                <p className="text-status-high text-xs mt-2">{errors.consentDataStorage.message}</p>
              )}
            </div>

            {/* Server error */}
            {serverError && (
              <div role="alert" className="error-box animate-fade-up">
                {serverError}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="btn btn-primary w-full active:scale-[0.97] transition-transform disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ transitionTimingFunction: "cubic-bezier(0.23, 1, 0.32, 1)" }}
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

/** Password strength calculator */
function getPasswordStrength(pw) {
  if (!pw) return { percent: 0, label: "", color: "#C4B9B0" };
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;

  if (score <= 1) return { percent: 20, label: "Weak", color: "#B23A3A" };
  if (score <= 2) return { percent: 40, label: "Fair", color: "#B8862E" };
  if (score <= 3) return { percent: 65, label: "Good", color: "#A68A4E" };
  if (score <= 4) return { percent: 85, label: "Strong", color: "#4D7A60" };
  return { percent: 100, label: "Excellent", color: "#4D7A60" };
}
