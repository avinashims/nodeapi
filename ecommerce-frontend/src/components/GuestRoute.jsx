import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function GuestRoute() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) return <p className="auth-loading">Loading…</p>;
  if (isAuthenticated) return <Navigate to="/" replace />;
  return <Outlet />;
}
