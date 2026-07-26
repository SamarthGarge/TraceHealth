import { create } from "zustand";
import { persist } from "zustand/middleware";
import { logout as apiLogout } from "../api/auth";

export const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      setUser: (user) => set({ user }),
      logout: async () => {
        try {
          await apiLogout();
        } catch (e) {
          console.error("Logout API failed", e);
        }
        set({ user: null });
      },
    }),
    {
      name: "tracehealth-auth-storage", // unique name for localStorage key
    }
  )
);
