import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthProvider.jsx";

/**
 * Layout route that guards all children behind authentication.
 * Unauthenticated visitors are redirected to /login with the
 * original destination preserved in location.state.from so
 * Login can redirect back after a successful sign-in.
 */
export default function RequireAuth() {
  const { token } = useAuth();
  const location = useLocation();

  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
}
