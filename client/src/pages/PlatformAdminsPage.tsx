import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  listAdmins,
  promoteAdmin,
  demoteAdmin,
  PlatformAdmin,
} from "../services/platformApi";
import { useAuth } from "../contexts/AuthContext";

export default function PlatformAdminsPage() {
  const { user } = useAuth();
  const [admins, setAdmins] = useState<PlatformAdmin[]>([]);
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = () => {
    setLoading(true);
    listAdmins()
      .then(setAdmins)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    reload();
  }, []);

  const handlePromote = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setStatus(null);
    if (!email.trim()) return;
    try {
      await promoteAdmin(email.trim());
      setStatus(`Promoted ${email.trim()}.`);
      setEmail("");
      reload();
    } catch (err: any) {
      setError(err.message || "Promote failed");
    }
  };

  const handleDemote = async (admin: PlatformAdmin) => {
    if (!confirm(`Demote ${admin.email}? They'll lose access to /platform on their next request.`)) return;
    setError(null);
    setStatus(null);
    try {
      await demoteAdmin(admin.id);
      setStatus(`Demoted ${admin.email}.`);
      reload();
    } catch (err: any) {
      setError(err.message || "Demote failed");
    }
  };

  return (
    <div className="min-h-screen px-6 py-10 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-serif text-3xl font-bold text-gray-900">Platform Admins</h1>
        <Link
          to="/platform"
          className="px-5 py-2 border-2 border-gray-300 text-gray-700 rounded-md text-sm font-medium hover:border-gray-500 transition-colors"
        >
          &larr; Back
        </Link>
      </div>

      <div className="bg-cream rounded-xl border-2 border-gray-300 p-6 mb-6">
        <h2 className="font-serif text-lg font-bold mb-2">Promote a user</h2>
        <p className="text-xs text-gray-500 mb-3">
          User must have signed in at least once before they can be promoted (so we have their record).
        </p>
        <form onSubmit={handlePromote} className="flex gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="user@example.com"
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
          />
          <button
            type="submit"
            className="px-5 py-2 bg-accent text-white rounded-lg font-medium hover:opacity-90"
          >
            Promote
          </button>
        </form>
      </div>

      {error && <p className="text-red-600 text-sm mb-3">{error}</p>}
      {status && <p className="text-green-700 text-sm mb-3">{status}</p>}

      <div className="bg-cream rounded-xl border-2 border-gray-300 divide-y divide-gray-200">
        {loading && <p className="p-4 text-gray-500 text-sm">Loading...</p>}
        {!loading && admins.length === 0 && (
          <p className="p-4 text-gray-500 text-sm">No platform admins.</p>
        )}
        {admins.map((a) => (
          <div key={a.id} className="p-4 flex items-center justify-between">
            <div>
              <div className="font-medium text-gray-900">{a.name}</div>
              <div className="text-sm text-gray-500">{a.email}</div>
            </div>
            <button
              type="button"
              onClick={() => handleDemote(a)}
              disabled={a.id === user?.id}
              className="px-3 py-1 text-sm border border-red-300 text-red-600 rounded hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed"
              title={a.id === user?.id ? "Cannot demote yourself" : undefined}
            >
              Demote
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
