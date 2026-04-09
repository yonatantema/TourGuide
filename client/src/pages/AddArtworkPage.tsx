import { useState, FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { createArtwork } from "../services/artworkApi";

export default function AddArtworkPage() {
  const navigate = useNavigate();
  const [artistName, setArtistName] = useState("");
  const [artworkName, setArtworkName] = useState("");
  const [artworkInfo, setArtworkInfo] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!image) return alert("Please select an image");
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("artist_name", artistName);
      formData.append("artwork_name", artworkName);
      formData.append("artwork_info", artworkInfo);
      formData.append("image", image);
      await createArtwork(formData);
      navigate("/gallery");
    } catch (err: any) {
      if (err?.code === "USAGE_LIMIT_REACHED") {
        alert("You've reached your monthly artwork creation limit (10/month). Your limit resets at the start of next month.");
      } else {
        console.error(err);
        alert("Failed to add artwork");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen px-6 py-10 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-serif text-3xl font-bold text-gray-900">Add Artwork</h1>
        <Link
          to="/gallery"
          className="px-5 py-2 border-2 border-gray-300 text-gray-700 rounded-md text-sm font-medium hover:border-gray-500 transition-colors"
        >
          &larr; Back to Gallery
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 md:p-8 space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Artwork Name</label>
          <input
            type="text"
            required
            value={artworkName}
            onChange={(e) => setArtworkName(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Artist Name</label>
          <input
            type="text"
            required
            value={artistName}
            onChange={(e) => setArtistName(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Artwork Information</label>
          <textarea
            required
            rows={5}
            value={artworkInfo}
            onChange={(e) => setArtworkInfo(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent resize-vertical"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Image</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setImage(e.target.files?.[0] || null)}
            className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-accent file:text-white hover:file:opacity-90 file:cursor-pointer"
          />
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3 bg-accent text-white rounded-lg font-medium hover:opacity-90 transition-colors disabled:opacity-50"
        >
          {submitting ? "Adding..." : "Add Artwork"}
        </button>
      </form>
    </div>
  );
}
