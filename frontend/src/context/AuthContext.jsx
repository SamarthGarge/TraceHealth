import React, { createContext, useContext } from "react";
import { useSession } from "../lib/authClient";

/**
 * AuthContext — thin wrapper around Better Auth's useSession hook.
 * Exposes the current user and session state app-wide.
 *
 * Token management is handled entirely by Better Auth (in-memory only,
 * never localStorage) — see docs/Auth_Service_Architecture.md §5 and
 * Frontend doc §4.2 for the security rationale.
 */
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const { data: sessionData, isPending, error } = useSession();

  const value = {
    user: sessionData?.user ?? null,
    session: sessionData?.session ?? null,
    isLoading: isPending,
    isAuthenticated: !!sessionData?.user,
    isAdmin: sessionData?.user?.role === "admin",
    hasConsented: !!sessionData?.user?.consentDataStorage,
    error,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Hook to access auth state in any component.
 * @returns {{ user, session, isLoading, isAuthenticated, isAdmin, hasConsented, error }}
 */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
