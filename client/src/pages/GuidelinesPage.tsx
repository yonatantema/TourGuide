import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getAllGuides, Guide } from "../services/guideApi";

export default function GuidelinesPage() {
  const [guides, setGuides] = useState<Guide[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAllGuides(true)
      .then(setGuides)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen px-6 py-10 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="font-serif text-5xl font-bold text-gray-900">AI Guide Settings</h1>
          <p className="text-gray-500 mt-2">Manage your AI guide personalities</p>
        </div>
        <div className="flex gap-3 mt-4 sm:mt-0">
          <Link
            to="/admin"
            className="px-5 py-2 border-2 border-gray-300 text-gray-700 rounded-md text-sm font-medium hover:border-gray-500 transition-colors"
          >
            &larr; Back to Admin
          </Link>
          <Link
            to="/guidelines/add"
            className="px-5 py-2 bg-accent text-white rounded-md text-sm font-medium hover:opacity-90 transition-colors"
          >
            + Add Guide
          </Link>
        </div>
      </div>

      {loading ? (
        <p className="text-center text-gray-500 mt-20">Loading guides...</p>
      ) : guides.length === 0 ? (
        <p className="text-center text-gray-500 mt-20">No guides yet. Add your first one!</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {guides.map((guide) => (
            <Link
              key={guide.id}
              to={`/guidelines/${guide.id}`}
              className="bg-cream rounded-xl border-2 border-gray-300 overflow-hidden hover:shadow-lg transition-shadow p-5"
            >
              <div className="flex items-center gap-2 mb-2">
                <h3 className="font-semibold text-gray-900 text-sm">{guide.name}</h3>
                {guide.hidden && (
                  <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded">Hidden</span>
                )}
              </div>
              <p className="text-xs text-gray-500 line-clamp-3">{guide.description}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
