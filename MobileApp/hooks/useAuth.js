/**
 * useAuth — convenience re-export so screens can import from hooks/useAuth
 * instead of reaching into contexts/AuthContext directly.
 *
 * Usage:
 *   import { useAuth } from '../hooks/useAuth';
 *   const { user, login, logout, isAuthenticated } = useAuth();
 */
export { useAuth } from "../contexts/AuthContext";
