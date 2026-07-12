import axios from "axios";

/**
 * Shared Axios instance for all FastAPI backend calls.
 * - withCredentials: true  — sends httpOnly auth cookies automatically
 * - baseURL from env       — never user-supplied
 * - 401 interceptor        — calls /api/auth/refresh once, then gives up
 */
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  withCredentials: true, // required for httpOnly cookie to be sent cross-origin
});

// ── 401 retry interceptor ─────────────────────────────────────────────────────
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;

    // Only retry once, and only on 401 (not on /refresh itself to avoid loops)
    if (
      error.response?.status === 401 &&
      !original._retried &&
      !original.url?.includes("/auth/refresh")
    ) {
      original._retried = true;
      try {
        await apiClient.post("/api/auth/refresh");
        return apiClient(original); // retry the original request
      } catch {
        // Refresh failed — caller (AuthContext) will handle redirect to /login
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
