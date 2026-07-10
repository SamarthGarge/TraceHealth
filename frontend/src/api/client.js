import axios from "axios";
import { authClient } from "../lib/authClient";

/**
 * Shared Axios instance for all FastAPI backend calls.
 * - baseURL is pinned to an environment variable (never user-supplied) — Frontend doc §4.3
 * - Request interceptor attaches the bearer token from the Better Auth session
 * - Response interceptor handles silent 401 → session refresh → retry once
 * - _retried flag prevents infinite refresh loops — Frontend doc §4.3
 */
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  withCredentials: true, // needed for the httpOnly refresh cookie
});

// ── Request interceptor ───────────────────────────────────────────────────────
apiClient.interceptors.request.use(async (config) => {
  // Pull the session token from Better Auth (in-memory only, never localStorage)
  const session = await authClient.getSession();
  const token = session?.data?.session?.token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Response interceptor ─────────────────────────────────────────────────────
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retried) {
      originalRequest._retried = true; // guard against infinite loops

      try {
        // Attempt silent session refresh via Better Auth
        await authClient.getSession({ fetchOptions: { cache: "no-store" } });

        // Re-attach the new token and retry the original request
        const session = await authClient.getSession();
        const newToken = session?.data?.session?.token;
        if (newToken) {
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
        }
        return apiClient(originalRequest);
      } catch {
        // Refresh failed — AuthContext will clear state on next useSession check
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
