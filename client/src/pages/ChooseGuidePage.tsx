import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getAllGuides, Guide } from "../services/guideApi";
import temaLogo from "../assets/tema-logo.png";

export default function ChooseGuidePage() {
  const [guides, setGuides] = useState<Guide[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAllGuides()
      .then(setGuides)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen px-6 py-10 max-w-5xl mx-auto flex flex-col relative">
      <h1 className="font-serif text-5xl md:text-6xl font-bold text-gray-900 text-center mb-4">
        Choose Your<br />Guide
      </h1>
      <p className="text-accent text-center mb-10">
        Choose your preferred guide style for your exciting museum journey
      </p>

      {loading ? (
        <p className="text-center text-gray-500 mt-20">Loading guides...</p>
      ) : guides.length === 0 ? (
        <p className="text-center text-gray-500 mt-20">No guides available yet.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-3xl">
          {guides.map((guide) => (
            <Link
              key={guide.id}
              to={`/guides/${guide.id}`}
              className="bg-cream rounded-xl border-2 border-gray-300 p-6 hover:shadow-lg transition-shadow flex items-start gap-4"
            >
              <div className="flex-shrink-0 w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div>
                <h3 className="font-serif text-xl font-bold text-gray-900">{guide.name}</h3>
                <p className="text-sm text-gray-500 mt-1">{guide.description}</p>
              </div>
            </Link>
          ))}
        </div>
      )}

      <Link to="/" className="self-end mt-auto pt-6">
        <img src={temaLogo} alt="TEMA" className="w-14" />
      </Link>
    </div>
  );
}
