import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { Navigate } from "react-router-dom";
import Dashboard from "./Dashboard";
import Admin from "./Admin";
import { Loader2 } from "lucide-react";

export default function Index() {
  const { user, loading } = useAuth();
  const { isAdmin, loading: roleLoading } = useUserRole();

  if (loading || roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 text-primary animate-spin" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  if (isAdmin) return <Admin />;

  return <Dashboard />;
}
