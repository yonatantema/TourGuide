import { Link } from "react-router-dom";

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center">
      <div className="max-w-2xl">
        <h1 className="font-serif text-5xl md:text-6xl font-bold text-gray-900 mb-6">
          Welcome to the Museum{" "}
          <span className="text-accent">AI tour guide</span>
        </h1>
        <p className="text-lg text-gray-600 mb-10">
          Unlock The Unseen. Discover the collections with the AI Museum guide
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button className="px-8 py-3 border-2 border-gray-800 text-gray-800 rounded-md font-medium hover:bg-gray-800 hover:text-white transition-colors">
            Take me to the guide
          </button>
          <Link
            to="/admin"
            className="px-8 py-3 bg-gray-900 text-white rounded-md font-medium hover:bg-gray-700 transition-colors"
          >
            Admin
          </Link>
        </div>
      </div>
      <footer className="absolute bottom-6 text-sm text-gray-400">
        &copy; TEMA Creative 2026 - All Rights Reserved
      </footer>
    </div>
  );
}
