import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { forgotPassword } from "../api/auth";

const forgotSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

/**
 * Forgot Password page — editorial split-panel layout matching Login/Signup.
 * Left: brand + reassurance. Right: email form → success state.
 */
export default function ForgotPassword() {
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: zodResolver(forgotSchema) });

  async function onSubmit(data) {
    setIsLoading(true);
    try {
      await forgotPassword(data.email);
      setSubmittedEmail(data.email);
      setSubmitted(true);
    } catch {
      // Even on error, show success — prevent email enumeration
      setSubmittedEmail(data.email);
      setSubmitted(true);
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
            Don't worry,
            it happens to
            the best of us.
          </h1>
          <p className="text-ink-mid text-base leading-relaxed max-w-sm">
            We'll send you a secure link to reset your password.
            The link expires in 15 minutes for your safety.
          </p>
        </div>

        {/* Security features */}
        <div className="flex flex-col gap-3 mb-10 animate-fade-up stagger-2">
          {[
            "Secure JWT-based reset link",
            "15-minute expiry window",
            "No password stored in email",
            "One-time use token",
          ].map((feature) => (
            <div key={feature} className="flex items-center gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-terra shrink-0" />
              <span className="text-ink-mid text-sm font-medium">{feature}</span>
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

          {submitted ? (
            /* ── Success state ── */
            <div className="animate-fade-up">
              <div className="w-14 h-14 rounded-2xl bg-terra-dim flex items-center justify-center mb-5">
                <svg className="w-7 h-7 text-terra" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h2 className="text-2xl font-semibold text-ink mb-2">Check your email</h2>
              <p className="text-ink-light text-sm mb-2 leading-relaxed">
                If an account exists for <strong className="text-ink">{submittedEmail}</strong>,
                we've sent a password reset link.
              </p>
              <p className="text-ink-ghost text-xs mb-6 leading-relaxed">
                The link expires in 15 minutes. Check your spam folder if you don't see it.
              </p>

              <Link
                to="/login"
                className="btn btn-primary w-full active:scale-[0.97] transition-transform mb-3"
                style={{ transitionTimingFunction: "cubic-bezier(0.23, 1, 0.32, 1)" }}
              >
                Back to sign in
              </Link>

              <button
                onClick={() => { setSubmitted(false); setSubmittedEmail(""); }}
                className="w-full text-center text-xs text-terra font-medium hover:text-terra-dark transition-colors py-2"
              >
                Try a different email
              </button>
            </div>
          ) : (
            /* ── Form state ── */
            <>
              <h2 className="text-2xl font-semibold text-ink mb-1">Reset password</h2>
              <p className="text-ink-light text-sm mb-8">
                Enter the email address associated with your account and we'll send you a reset link.
              </p>

              <form onSubmit={handleSubmit(onSubmit)} noValidate>
                <div className="mb-6">
                  <label className="input-label" htmlFor="forgot-email">
                    Email address
                  </label>
                  <input
                    id="forgot-email"
                    type="email"
                    autoComplete="email"
                    autoFocus
                    className="input"
                    placeholder="you@example.com"
                    {...register("email")}
                  />
                  {errors.email && (
                    <p className="text-status-high text-xs mt-1.5">{errors.email.message}</p>
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
                    "Send reset link"
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
