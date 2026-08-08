import React, { useState, useMemo } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { resetPassword } from "../api/auth";

const resetSchema = z.object({
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string().min(1, "Please confirm your password"),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

/**
 * Reset Password page — reads ?token= from URL, lets user set a new password.
 * Same editorial split-panel layout as Login/Signup/ForgotPassword.
 */
export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token") || "";

  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState("");
  const [success, setSuccess] = useState(false);

  const hasToken = useMemo(() => token.length > 10, [token]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: zodResolver(resetSchema) });

  async function onSubmit(data) {
    setIsLoading(true);
    setServerError("");
    try {
      await resetPassword(token, data.newPassword);
      setSuccess(true);
      // Redirect to login after 3 seconds
      setTimeout(() => navigate("/login", { state: { passwordReset: true } }), 3000);
    } catch (err) {
      const msg = err.response?.data?.detail || "Failed to reset password. The link may have expired.";
      setServerError(msg);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="auth-layout">
      {/* ── Left brand panel ───────────────────────────────────────────── */}
      <div className="auth-brand-panel">
        <div className="mb-8 animate-fade-up">
          <div className="flex items-center gap-2.5 mb-8">
            <img src="/new_logo.svg" alt="" className="w-8 h-8 rounded-lg border border-border-soft" />
            <span className="font-serif text-lg text-ink">TraceHealth</span>
          </div>
          <h1 className="font-display text-4xl sm:text-5xl font-semibold leading-tight text-ink mb-6 text-balance">
            Choose a new
            password.
          </h1>
          <p className="text-ink-mid text-base leading-relaxed max-w-sm">
            Pick something strong and unique. Your account security matters to us.
          </p>
        </div>

        {/* Password tips */}
        <div className="flex flex-col gap-3 mb-10 animate-fade-up stagger-2">
          {[
            "At least 8 characters",
            "Mix of letters, numbers, symbols",
            "Avoid using common words",
            "Don't reuse passwords",
          ].map((tip) => (
            <div key={tip} className="flex items-center gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-terra shrink-0" />
              <span className="text-ink-mid text-sm font-medium">{tip}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right form panel ───────────────────────────────────────────── */}
      <div className="auth-form-panel">
        <div className="w-full animate-fade-up" style={{ maxWidth: 380 }}>
          {/* Mobile-only logo */}
          <div className="flex items-center gap-2.5 mb-6 md:hidden">
            <img src="/new_logo.svg" alt="" className="w-7 h-7 rounded-lg border border-border-soft" />
            <span className="font-serif text-lg text-ink">TraceHealth</span>
          </div>

          {!hasToken ? (
            /* ── No token state ── */
            <div className="animate-fade-up">
              <div className="w-14 h-14 rounded-2xl bg-status-high-dim flex items-center justify-center mb-5">
                <svg className="w-7 h-7 text-status-high" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.999L13.732 4.001c-.77-1.333-2.694-1.333-3.464 0L3.34 16.001C2.57 17.334 3.532 19 5.072 19z" />
                </svg>
              </div>
              <h2 className="text-2xl font-semibold text-ink mb-2">Invalid reset link</h2>
              <p className="text-ink-light text-sm mb-6 leading-relaxed">
                This password reset link is invalid or has expired. Please request a new one.
              </p>
              <Link
                to="/forgot-password"
                className="btn btn-primary w-full active:scale-[0.97] transition-transform"
                style={{ transitionTimingFunction: "cubic-bezier(0.23, 1, 0.32, 1)" }}
              >
                Request new link
              </Link>
            </div>
          ) : success ? (
            /* ── Success state ── */
            <div className="animate-fade-up">
              <div className="w-14 h-14 rounded-2xl bg-status-low-dim flex items-center justify-center mb-5">
                <svg className="w-7 h-7 text-status-low" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-2xl font-semibold text-ink mb-2">Password updated</h2>
              <p className="text-ink-light text-sm mb-6 leading-relaxed">
                Your password has been reset successfully. You'll be redirected to the login page in a moment.
              </p>
              <Link
                to="/login"
                className="btn btn-primary w-full active:scale-[0.97] transition-transform"
                style={{ transitionTimingFunction: "cubic-bezier(0.23, 1, 0.32, 1)" }}
              >
                Sign in now
              </Link>
            </div>
          ) : (
            /* ── Form state ── */
            <>
              <h2 className="text-2xl font-semibold text-ink mb-1">Set new password</h2>
              <p className="text-ink-light text-sm mb-8">
                Enter your new password below. Make sure it's at least 8 characters.
              </p>

              <form onSubmit={handleSubmit(onSubmit)} noValidate>
                {serverError && (
                  <div className="error-box mb-4 animate-fade-up" role="alert">
                    {serverError}
                  </div>
                )}

                <div className="mb-4">
                  <label className="input-label" htmlFor="reset-new-password">
                    New password
                  </label>
                  <input
                    id="reset-new-password"
                    type="password"
                    autoComplete="new-password"
                    autoFocus
                    className="input"
                    placeholder="••••••••"
                    {...register("newPassword")}
                  />
                  {errors.newPassword && (
                    <p className="text-status-high text-xs mt-1.5">{errors.newPassword.message}</p>
                  )}
                </div>

                <div className="mb-6">
                  <label className="input-label" htmlFor="reset-confirm-password">
                    Confirm new password
                  </label>
                  <input
                    id="reset-confirm-password"
                    type="password"
                    autoComplete="new-password"
                    className="input"
                    placeholder="••••••••"
                    {...register("confirmPassword")}
                  />
                  {errors.confirmPassword && (
                    <p className="text-status-high text-xs mt-1.5">{errors.confirmPassword.message}</p>
                  )}
                </div>

                <button
                  type="submit"
                  className="btn btn-primary w-full active:scale-[0.97] transition-transform"
                  style={{ transitionTimingFunction: "cubic-bezier(0.23, 1, 0.32, 1)" }}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <span className="spinner" style={{ width: 16, height: 16 }} />
                  ) : (
                    "Reset password"
                  )}
                </button>
              </form>

              <p className="text-center text-sm text-ink-light mt-6">
                Remember your password?{" "}
                <Link to="/login" className="text-terra font-medium hover:text-terra-dark transition-colors">
                  Sign in
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
