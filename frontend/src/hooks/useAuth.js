/**
 * useAuth — convenience re-export of the AuthContext hook.
 * Import from here instead of AuthContext directly so that
 * components don't need to know where auth state lives.
 *
 * Usage:
 *   import { useAuth } from "../hooks/useAuth";
 *   const { user, isAuthenticated, isAdmin, logout } = useAuth();
 */
export { useAuth } from "../context/AuthContext";
