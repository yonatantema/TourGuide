import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { API_URL, getToken } from "../services/api";

export default function SetupPage() {
  const { user, refreshAuth } = useAuth();
  const navigate = useNavigate();
  const [orgName, setOrgName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSetup = async (seed: boolean) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/auth/setup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          orgName: orgName.trim() || `${user?.name}'s Museum`,
          seed,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Setup failed");
        setLoading(false);
        return;
      }

      await refreshAuth();
      navigate("/", { replace: true });
    } catch (err) {
      console.error("Setup error:", err);
      setError("Setup failed. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="h-[100dvh] flex flex-col items-center justify-center px-4 text-center">
      <div className="max-w-md w-full">
        <h1 className="font-serif text-4xl font-bold text-gray-900 mb-2">
          Welcome{user?.name ? `, ${user.name.split(" ")[0]}` : ""}!
        </h1>
        <p className="text-gray-600 mb-8">
          Let's set up your account. Give your museum a name and choose how to start.
        </p>

        <div className="mb-8">
          <label className="block text-sm font-medium text-gray-700 text-left mb-2">
            Museum name
          </label>
          <input
            type="text"
            value={orgName}
            onChange={(e) => setOrgName(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
          />
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={() => handleSetup(true)}
            disabled={loading}
            className="w-full px-6 py-3 border-2 border-accent bg-accent text-white rounded-md font-medium hover:bg-transparent hover:text-accent transition-colors disabled:opacity-50"
          >
            Start with demo data
          </button>
          <button
            onClick={() => handleSetup(false)}
            disabled={loading}
            className="w-full px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-md font-medium hover:border-gray-400 transition-colors disabled:opacity-50"
          >
            Start from scratch
          </button>
        </div>

        {error && <p className="mt-4 text-red-600 text-sm">{error}</p>}
      </div>
    </div>
  );
}
