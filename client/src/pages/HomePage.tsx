import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function HomePage() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="h-[100dvh] flex flex-col items-center justify-center px-4 text-center relative overflow-hidden">
      <button
        onClick={handleLogout}
        className="absolute top-6 right-6 px-4 py-2 text-sm border border-gray-300 text-gray-600 rounded-md hover:bg-gray-100 transition-colors"
      >
        Logout
      </button>
      <div className="max-w-2xl">
        <h1 className="font-serif text-5xl md:text-6xl font-bold text-gray-900 mb-6">
          Welcome to the<br />
          <span className="text-accent">AI Museum Guide</span>
        </h1>
        <p className="text-lg text-gray-600 mb-10">
          Your personal AI companion. Ask anything and discover deeper insights behind every artwork.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            to="/guides"
            className="px-8 py-3 border-2 border-accent bg-accent text-white rounded-md font-medium hover:bg-transparent hover:text-accent transition-colors"
          >
            Take me to the guide
          </Link>
          <Link
            to="/admin"
            className="px-8 py-3 border-2 border-gray-800 text-gray-800 rounded-md font-medium hover:bg-gray-800 hover:text-white transition-colors"
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
