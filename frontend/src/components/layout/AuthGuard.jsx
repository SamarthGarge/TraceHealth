import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

/**
 * AuthGuard — wraps protected routes.
 * - Redirects unauthenticated users to /login (preserving the attempted URL as state)
 * - requireAdmin=true: redirects non-admin users to /404 (consistent with
 *   the ownership-check-then-404 pattern from Backend doc §3.5 — never 403)
 *
 * Usage in App.jsx:
 *   <Route element={<AuthGuard />}>           ← standard auth gate
 *   <Route element={<AuthGuard requireAdmin />}>  ← admin-only gate
 */
export default function AuthGuard({ requireAdmin = false }) {
  const { isAuthenticated, isAdmin, isLoading } = useAuth();
  const location = useLocation();

  // While Better Auth resolves the session, show a minimal spinner
  // (avoids a flash of the login page for already-authenticated users)
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-parchment">
        <div className="spinner" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requireAdmin && !isAdmin) {
    // 404 — consistent with server-side ownership-check-then-404 pattern
    return <Navigate to="/404" replace />;
  }

  return <Outlet />;
}
