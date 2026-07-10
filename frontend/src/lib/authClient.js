import { createAuthClient } from "better-auth/react";

/**
 * Better Auth client instance for the frontend.
 * Replaces the hand-rolled AuthContext token management — see
 * docs/Auth_Service_Architecture.md §5 for the full rationale.
 *
 * VITE_AUTH_SERVICE_URL must point at the running auth-service
 * (default: http://localhost:4000 in dev, the deployed Render URL in prod).
 */
export const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_AUTH_SERVICE_URL,
});

export const { signIn, signUp, signOut, useSession } = authClient;
