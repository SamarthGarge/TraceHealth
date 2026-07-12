/**
 * Auth API calls — plain Axios wrapper around FastAPI auth endpoints.
 * Replaces the Better Auth client entirely.
 *
 * Cookies (httpOnly, SameSite=Lax) are set by the server on login/signup.
 * The frontend never reads or stores tokens directly.
 */
import apiClient from "./client";

/**
 * Register a new account.
 * @param {{ name, email, password, consentDataStorage }} data
 * @returns {{ user, message }}
 */
export async function signup(data) {
  const res = await apiClient.post("/api/auth/signup", data);
  return res.data;
}

/**
 * Log in with email + password.
 * @param {{ email, password }} data
 * @returns {{ user, message }}
 */
export async function login(data) {
  const res = await apiClient.post("/api/auth/login", data);
  return res.data;
}

/**
 * Log out — clears httpOnly cookies server-side.
 */
export async function logout() {
  await apiClient.post("/api/auth/logout");
}

/**
 * Fetch the current user's profile.
 * Returns null if not authenticated.
 */
export async function getMe() {
  try {
    const res = await apiClient.get("/api/auth/me");
    return res.data;
  } catch {
    return null;
  }
}

/**
 * Redirect to the Google OAuth flow.
 * The backend handles the redirect — no axios call needed.
 */
export function loginWithGoogle() {
  window.location.href = `${import.meta.env.VITE_API_BASE_URL}/api/auth/google`;
}
