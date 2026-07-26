import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "../context/AuthContext";
import apiClient from "../api/client";

const adminLoginSchema = z.object({
  email:    z.string().email("Valid email required"),
  password: z.string().min(1, "Password required"),
});

export default function AdminLogin() {
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const [isLoading, setIsLoading]   = useState(false);
  const [serverError, setServerError] = useState("");

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(adminLoginSchema),
  });

  async function onSubmit(data) {
    setIsLoading(true);
    setServerError("");
    try {
      const res = await apiClient.post("/api/auth/admin/login", data);
      setUser(res.data.user);
      navigate("/admin", { replace: true });
    } catch (err) {
      const status = err.response?.status;
      const detail = err.response?.data?.detail;
      if (status === 403) {
        setServerError("Access denied. This account does not have admin privileges.");
      } else {
        setServerError(detail || "Invalid credentials. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-parchment flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <span className="w-7 h-7 rounded-lg bg-terra flex items-center justify-center text-white font-bold text-sm">T</span>
          <span className="font-serif text-xl text-ink">TraceHealth</span>
          <span className="text-xs font-mono text-ink-ghost ml-1 border border-border px-1.5 py-0.5 rounded">Admin</span>
        </div>

        <div className="bg-white border border-border rounded-2xl p-8 shadow-sm">
          <h1 className="font-serif text-2xl text-ink mb-1">Admin Sign In</h1>
          <p className="text-xs text-ink-ghost mb-6">Restricted access — admin accounts only.</p>

          {serverError && (
            <div className="mb-5 p-3 rounded-lg border border-status-high bg-status-high-dim text-status-high text-sm">
              {serverError}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-ink-mid mb-1.5">Email</label>
              <input
                type="email"
                autoComplete="email"
                {...register("email")}
                className={`w-full px-3.5 py-2.5 rounded-lg border text-sm text-ink bg-white
                  focus:outline-none focus:ring-2 focus:ring-terra focus:border-transparent transition
                  ${errors.email ? "border-status-high" : "border-border"}`}
                placeholder="admin@example.com"
              />
              {errors.email && (
                <p className="mt-1 text-xs text-status-high">{errors.email.message}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold text-ink-mid mb-1.5">Password</label>
              <input
                type="password"
                autoComplete="current-password"
                {...register("password")}
                className={`w-full px-3.5 py-2.5 rounded-lg border text-sm text-ink bg-white
                  focus:outline-none focus:ring-2 focus:ring-terra focus:border-transparent transition
                  ${errors.password ? "border-status-high" : "border-border"}`}
                placeholder="••••••••"
              />
              {errors.password && (
                <p className="mt-1 text-xs text-status-high">{errors.password.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 rounded-lg bg-terra text-white text-sm font-semibold
                hover:bg-terra-dark transition-colors disabled:opacity-60 disabled:cursor-not-allowed mt-2"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Signing in…
                </span>
              ) : "Sign in as Admin"}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-ink-ghost mt-6">
          Not an admin?{" "}
          <button onClick={() => navigate("/login")} className="text-terra hover:underline">
            Regular sign in
          </button>
        </p>

        <div className="mt-8 p-4 rounded-xl border border-border bg-white/60">
          <p className="text-xs font-semibold text-ink-mid mb-2">First-time setup</p>
          <p className="text-xs text-ink-ghost leading-relaxed">
            Run the setup once to create the admin account from your <code className="text-xs bg-parchment px-1 rounded">.env</code> file:
          </p>
          <code className="block mt-2 text-xs bg-parchment px-3 py-2 rounded-lg text-ink-mid break-all">
            POST /api/auth/admin/setup
          </code>
        </div>
      </div>
    </div>
  );
}
