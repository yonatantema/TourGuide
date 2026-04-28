import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

// Wraps every /platform/* route. Redirects:
// - unauthenticated users to /login (consistent with ProtectedRoute)
// - authenticated non-platform-admins to / so a regular customer never lands
//   on a half-loaded admin screen they can't use.
export default function PlatformProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, needsSetup, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-stone-800" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (needsSetup) return <Navigate to="/setup" replace />;
  if (user.platformRole !== "platform_admin") return <Navigate to="/" replace />;

  return <>{children}</>;
}
