import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getAllGuides, Guide } from "../services/guideApi";
import backButton from "../assets/back-button.png";
import { GUIDE_ICONS } from "../assets/guide-icons";

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
              className="bg-cream rounded-xl border-2 border-gray-300 p-6 hover:shadow-lg transition-shadow flex items-center gap-5"
            >
              <img
                src={GUIDE_ICONS[guide.icon]?.src || GUIDE_ICONS["art-expert"].src}
                alt={guide.name}
                className="flex-shrink-0 w-[72px] h-[72px] rounded-lg"
              />
              <div>
                <h3 className="font-serif text-xl font-bold text-gray-900">{guide.name}</h3>
                <p className="text-sm text-gray-500 mt-1">{guide.description}</p>
              </div>
            </Link>
          ))}
        </div>
      )}

      <Link to="/" className="self-end mt-auto pt-6">
        <img src={backButton} alt="Back" className="w-12" />
      </Link>
    </div>
  );
}
