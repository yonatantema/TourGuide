import { Link } from "react-router-dom";

interface Card {
  to: string;
  title: string;
  description: string;
}

const CARDS: Card[] = [
  {
    to: "/platform/prompts",
    title: "Guide Prompts",
    description: "Edit the instructions sent to the AI for every conversation.",
  },
  {
    to: "/platform/models",
    title: "Models & Hyperparameters",
    description: "Switch model versions and tune temperature / max tokens.",
  },
  {
    to: "/platform/limits",
    title: "Usage Limits",
    description: "Per-user monthly caps and per-session ceiling.",
  },
  {
    to: "/platform/defaults",
    title: "Defaults for New Guides",
    description: "Voice, knowledge mode, and icon used when a guide is created without specifying.",
  },
  {
    to: "/platform/seed-content",
    title: "Seed Content",
    description: "Sample artworks and guides cloned into every new customer's org.",
  },
  {
    to: "/platform/admins",
    title: "Platform Admins",
    description: "Promote or demote TEMA Creative employees.",
  },
];

export default function PlatformPage() {
  return (
    <div className="min-h-screen flex flex-col px-6 py-10">
      <Link
        to="/admin"
        className="text-gray-800 font-medium hover:text-gray-600 transition-colors mb-8"
      >
        &larr; Back to Admin
      </Link>

      <div className="flex-1 flex flex-col items-center">
        <h1 className="font-serif text-5xl md:text-6xl font-bold text-gray-900 mb-3">
          Platform Admin
        </h1>
        <p className="text-gray-500 mb-12">
          Cross-customer settings — changes apply to every TourGuide org.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-3xl w-full">
          {CARDS.map((c) => (
            <Link
              key={c.to}
              to={c.to}
              className="bg-white rounded-xl border border-dashed border-gray-300 p-6 hover:border-accent transition-colors"
            >
              <h2 className="font-serif text-xl font-bold text-gray-900 mb-2">
                {c.title}
              </h2>
              <p className="text-gray-500 text-sm">{c.description}</p>
            </Link>
          ))}
        </div>
      </div>

      <footer className="text-center text-sm text-gray-400 mt-12">
        &copy; TEMA Creative 2026 — All Rights Reserved
      </footer>
    </div>
  );
}
