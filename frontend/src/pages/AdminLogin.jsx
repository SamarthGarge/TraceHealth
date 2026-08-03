import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "../context/AuthContext";
import apiClient from "../api/client";
import { Shield } from "lucide-react";

const adminLoginSchema = z.object({
  email:    z.string().email("Valid email required"),
  password: z.string().min(1, "Password required"),
});

/**
 * Admin Login — dark-themed variant of the auth flow.
 * Single centered card, no split panel. Responsive at all breakpoints.
 */
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
    <div className="min-h-screen bg-ink flex items-center justify-center p-6">
      <div className="w-full max-w-sm animate-fade-up">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <img src="/new_logo.svg" alt="" className="w-7 h-7 rounded-lg border border-white/10" />
          <span className="font-serif text-xl text-white/90">TraceHealth</span>
          <span className="text-[10px] font-mono text-white/40 ml-1 border border-white/15 px-1.5 py-0.5 rounded-full">
            Admin
          </span>
        </div>

        <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-8 backdrop-blur-sm shadow-2xl shadow-black/20">
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-8 h-8 rounded-lg bg-terra/15 flex items-center justify-center">
              <Shield className="w-4 h-4 text-terra" />
            </div>
            <h1 className="text-xl font-semibold text-white">Admin Sign In</h1>
          </div>
          <p className="text-xs text-white/40 mb-6 ml-[42px]">Restricted access — admin accounts only.</p>

          {serverError && (
            <div className="mb-5 p-3 rounded-xl border border-status-high/30 bg-status-high/10 text-status-high text-sm animate-fade-up">
              {serverError}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-[11px] font-semibold text-white/50 mb-1.5 uppercase tracking-wider">Email</label>
              <input
                type="email"
                autoComplete="email"
                {...register("email")}
                className={`w-full px-3.5 py-2.5 rounded-xl border text-sm text-white bg-white/[0.06] placeholder-white/25
                  focus:outline-none focus:ring-2 focus:ring-terra/50 focus:border-transparent transition-all
                  ${errors.email ? "border-status-high/50" : "border-white/10"}`}
                style={{ transitionTimingFunction: "cubic-bezier(0.23, 1, 0.32, 1)" }}
                placeholder="admin@example.com"
              />
              {errors.email && (
                <p className="mt-1.5 text-xs text-status-high">{errors.email.message}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="block text-[11px] font-semibold text-white/50 mb-1.5 uppercase tracking-wider">Password</label>
              <input
                type="password"
                autoComplete="current-password"
                {...register("password")}
                className={`w-full px-3.5 py-2.5 rounded-xl border text-sm text-white bg-white/[0.06] placeholder-white/25
                  focus:outline-none focus:ring-2 focus:ring-terra/50 focus:border-transparent transition-all
                  ${errors.password ? "border-status-high/50" : "border-white/10"}`}
                style={{ transitionTimingFunction: "cubic-bezier(0.23, 1, 0.32, 1)" }}
                placeholder="••••••••"
              />
              {errors.password && (
                <p className="mt-1.5 text-xs text-status-high">{errors.password.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 rounded-xl bg-terra text-white text-sm font-semibold
                hover:bg-terra-dark transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-2 active:scale-[0.97]
                shadow-lg shadow-terra/20 hover:shadow-xl hover:shadow-terra/30"
              style={{ transitionTimingFunction: "cubic-bezier(0.23, 1, 0.32, 1)" }}
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

        <p className="text-center text-xs text-white/30 mt-6">
          Not an admin?{" "}
          <button
            onClick={() => navigate("/login")}
            className="text-terra hover:text-terra-dark transition-colors"
          >
            Regular sign in
          </button>
        </p>

        <div className="mt-8 p-4 rounded-xl border border-white/8 bg-white/[0.03]">
          <p className="text-[11px] font-semibold text-white/50 mb-2 uppercase tracking-wider">First-time setup</p>
          <p className="text-xs text-white/30 leading-relaxed">
            Run the setup once to create the admin account from your <code className="text-[11px] bg-white/[0.06] px-1.5 py-0.5 rounded text-white/50">.env</code> file:
          </p>
          <code className="block mt-2 text-xs bg-white/[0.06] px-3 py-2 rounded-lg text-white/40 font-mono break-all">
            POST /api/auth/admin/setup
          </code>
        </div>
      </div>
    </div>
  );
}
