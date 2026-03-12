import { Link } from "react-router-dom";

export default function GuidelinesPage() {
  return (
    <div className="min-h-screen px-6 py-10 max-w-4xl mx-auto">
      <Link
        to="/admin"
        className="px-5 py-2 border-2 border-gray-300 text-gray-700 rounded-md text-sm font-medium hover:border-gray-500 transition-colors"
      >
        &larr; Back to Admin
      </Link>
    </div>
  );
}
