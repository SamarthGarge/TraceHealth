import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { getMe, logout as apiLogout } from "../api/auth";

/**
 * AuthContext — manages the current user state using a simple useState.
 * No Better Auth SDK. No localStorage. No token in JS memory.
 *
 * The JWT lives exclusively in an httpOnly cookie (set by FastAPI).
 * On app load we call GET /api/auth/me to find out if the cookie is still valid.
 * On logout we call POST /api/auth/logout to clear the cookie server-side.
 */
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [isLoading, setIsLoading] = useState(true); // true until /me check completes

  // On mount — check if we already have a valid session (cookie may be present)
  useEffect(() => {
    getMe()
      .then((data) => setUser(data))
      .finally(() => setIsLoading(false));
  }, []);

  const logout = useCallback(async () => {
    await apiLogout();
    setUser(null);
  }, []);

  const value = {
    user,
    setUser,                        // used by Login/Signup pages after successful auth
    isLoading,
    isAuthenticated: !!user,
    isAdmin: user?.role === "admin",
    hasConsented: !!user?.consentDataStorage,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Hook to access auth state in any component.
 * @returns {{ user, setUser, isLoading, isAuthenticated, isAdmin, hasConsented, logout }}
 */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
