import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { getUsage, UsageData } from "../services/usageApi";

function UsageBar({ label, used, limit, format }: { label: string; used: number; limit: number; format?: (n: number) => string }) {
  const pct = Math.min((used / limit) * 100, 100);
  const fmt = format || ((n: number) => String(n));
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-gray-600">{label}</span>
        <span className="text-gray-500">{fmt(used)} / {fmt(limit)}</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all ${pct >= 100 ? "bg-red-500" : pct >= 80 ? "bg-yellow-500" : "bg-accent"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function formatMinutes(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function AdminPage() {
  const [usage, setUsage] = useState<UsageData | null>(null);

  useEffect(() => {
    getUsage().then(setUsage).catch(console.error);
  }, []);

  return (
    <div className="min-h-screen flex flex-col px-6 py-10">
      <Link
        to="/"
        className="text-gray-800 font-medium hover:text-gray-600 transition-colors mb-8"
      >
        &larr; Back
      </Link>

      <div className="flex-1 flex flex-col items-center">
        <h1 className="font-serif text-5xl md:text-6xl font-bold text-gray-900 mb-3">
          Admin
        </h1>
        <p className="text-gray-500 mb-12">Manage your virtual museum</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl w-full">
          {/* Museum Collection Card */}
          <div className="bg-white rounded-xl border border-dashed border-gray-300 p-8 flex flex-col items-center text-center">
            <div className="w-14 h-14 bg-indigo-100 rounded-full flex items-center justify-center mb-5">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h2 className="font-serif text-xl font-bold text-gray-900 mb-2">Museum Collection</h2>
            <p className="text-gray-500 text-sm mb-6">Explore our stunning art collection</p>
            <Link
              to="/gallery"
              className="px-6 py-2 border border-gray-300 text-gray-800 rounded-md text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              View Gallery
            </Link>
          </div>

          {/* Guide the AI Card */}
          <div className="bg-white rounded-xl border border-dashed border-gray-300 p-8 flex flex-col items-center text-center">
            <div className="w-14 h-14 bg-indigo-100 rounded-full flex items-center justify-center mb-5">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <h2 className="font-serif text-xl font-bold text-gray-900 mb-2">Guide the AI</h2>
            <p className="text-gray-500 text-sm mb-6">Set guidelines for the AI</p>
            <Link
              to="/guidelines"
              className="px-6 py-2 border border-gray-300 text-gray-800 rounded-md text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              Start Guiding
            </Link>
          </div>
        </div>

        {/* Monthly Usage */}
        {usage && (
          <div className="max-w-2xl w-full mt-8 bg-white rounded-xl border border-dashed border-gray-300 p-6">
            <h2 className="font-serif text-lg font-bold text-gray-900 mb-4">Monthly Usage</h2>
            {usage.unlimited ? (
              <p className="text-gray-600 text-sm">Unlimited — no monthly caps on this account.</p>
            ) : (
              <div className="space-y-4">
                <UsageBar label="Artwork Creations" used={usage.artwork_creation.used} limit={usage.artwork_creation.limit} />
                <UsageBar label="Image Recognitions" used={usage.image_recognition.used} limit={usage.image_recognition.limit} />
                <UsageBar label="Conversation Time" used={usage.conversation_seconds.used} limit={usage.conversation_seconds.limit} format={formatMinutes} />
              </div>
            )}
          </div>
        )}
      </div>

      <footer className="text-center text-sm text-gray-400 mt-12">
        &copy; TEMA Creative 2026 - All Rights Reserved
      </footer>
    </div>
  );
}
