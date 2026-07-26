import React, { createContext, useContext, useEffect, useState } from "react";
import { getMe } from "../api/auth";
import { useAuthStore } from "../store/authStore";

/**
 * AuthContext — now uses Zustand + localStorage for persistent state.
 * The JWT still lives exclusively in an httpOnly cookie (set by FastAPI).
 * On app load, we instantly restore the user from localStorage (via Zustand),
 * preventing the loading screen flicker. We then call GET /api/auth/me in the background
 * to ensure the session is still valid.
 */
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const { user, setUser, logout } = useAuthStore();
  
  // If we already have a user in Zustand (via localStorage persist), we don't need to block the UI.
  const [isLoading, setIsLoading] = useState(!user);

  useEffect(() => {
    // Verify the httpOnly cookie session in the background
    getMe()
      .then((data) => {
        setUser(data);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [setUser]);

  const value = {
    user,
    setUser,
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
