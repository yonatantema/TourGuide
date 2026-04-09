import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { API_URL, setToken } from "../services/api";

export default function AuthCallbackPage() {
  const [error, setError] = useState<string | null>(null);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { refreshAuth } = useAuth();

  useEffect(() => {
    const code = searchParams.get("code");
    if (!code) {
      setError("No authorization code received");
      return;
    }

    (async () => {
      try {
        const res = await fetch(`${API_URL}/api/auth/google/callback`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code }),
        });

        if (!res.ok) {
          const data = await res.json();
          setError(data.error || "Authentication failed");
          return;
        }

        const data = await res.json();
        setToken(data.token);
        await refreshAuth();

        if (data.needsSetup) {
          navigate("/setup", { replace: true });
        } else {
          navigate("/", { replace: true });
        }
      } catch (err) {
        console.error("Auth callback error:", err);
        setError("Authentication failed. Please try again.");
      }
    })();
  }, [searchParams, navigate, refreshAuth]);

  if (error) {
    return (
      <div className="h-[100dvh] flex flex-col items-center justify-center px-4 text-center">
        <p className="text-red-600 mb-4">{error}</p>
        <a href="/login" className="text-accent underline">
          Back to login
        </a>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] flex flex-col items-center justify-center px-4 text-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-stone-800 mb-4" />
      <p className="text-gray-600">Signing you in...</p>
    </div>
  );
}
