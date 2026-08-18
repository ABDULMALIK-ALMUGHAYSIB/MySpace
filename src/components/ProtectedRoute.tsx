import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/context/AuthProvider";

export default function ProtectedRoute() {
  const { session, loading } = useAuth();

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-slate-50" />;
  }

  if (!session) return <Navigate to="/login" replace />;

  return <Outlet />;
}
