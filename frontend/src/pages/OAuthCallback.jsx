/**
 * OAuthCallback — handles the redirect from Google OAuth.
 *
 * Flow:
 *   Google → localhost:8000/api/auth/google/callback (sets cookies) →
 *   302 → localhost:5173/auth/callback (this page) →
 *   calls GET /api/auth/me with withCredentials to confirm cookie exists →
 *   navigate to /dashboard
 *
 * Why this page exists instead of redirecting directly to /dashboard:
 *   FastAPI's RedirectResponse sets httpOnly cookies on the 302 response,
 *   but the browser needs a moment to commit those cookies before a page
 *   that calls /api/auth/me can read them. Redirecting to /dashboard directly
 *   causes AuthGuard to run getMe() before the cookie is saved, causing a
 *   flash redirect back to /login. This intermediate page retries getMe()
 *   with exponential backoff and only navigates once auth is confirmed.
 */
import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getMe } from "../api/auth";
import { useAuth } from "../context/AuthContext";

const MAX_RETRIES = 6;
const BASE_DELAY_MS = 400;

export default function OAuthCallback() {
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const [error, setError] = useState(null);
  const triedRef = useRef(0);

  useEffect(() => {
    let cancelled = false;

    async function pollForSession() {
      for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        if (cancelled) return;

        try {
          const user = await getMe();
          if (user && !cancelled) {
            setUser(user);
            navigate("/dashboard", { replace: true });
            return;
          }
        } catch {
          // getMe() already swallows errors and returns null — catching here
          // for unexpected exceptions only.
        }

        if (attempt < MAX_RETRIES - 1) {
          // Exponential backoff: 400ms, 800ms, 1.6s, 3.2s, 6.4s
          await new Promise((r) =>
            setTimeout(r, BASE_DELAY_MS * Math.pow(2, attempt))
          );
        }
      }

      if (!cancelled) {
        setError(
          "Google sign-in completed but we couldn't verify your session. " +
            "Please try signing in again."
        );
      }
    }

    pollForSession();
    return () => {
      cancelled = true;
    };
  }, [navigate, setUser]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-parchment px-6">
        <div className="max-w-sm w-full text-center">
          <div className="error-box mb-6" role="alert">
            {error}
          </div>
          <a
            href="/login"
            className="btn btn-primary"
          >
            Back to sign in
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-parchment gap-4">
      <div className="spinner" style={{ width: 28, height: 28 }} />
      <p className="font-mono text-sm text-ink-light">Completing sign-in…</p>
    </div>
  );
}
