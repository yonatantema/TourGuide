import { useState, useEffect, FormEvent } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { getArtwork, updateArtwork, UPLOADS_URL } from "../services/artworkApi";

export default function EditArtworkPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [artistName, setArtistName] = useState("");
  const [artworkName, setArtworkName] = useState("");
  const [artworkInfo, setArtworkInfo] = useState("");
  const [currentImage, setCurrentImage] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!id) return;
    getArtwork(Number(id))
      .then((artwork) => {
        setArtistName(artwork.artist_name);
        setArtworkName(artwork.artwork_name);
        setArtworkInfo(artwork.artwork_info);
        setCurrentImage(artwork.image_filename);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("artist_name", artistName);
      formData.append("artwork_name", artworkName);
      formData.append("artwork_info", artworkInfo);
      if (image) {
        formData.append("image", image);
      }
      await updateArtwork(Number(id), formData);
      navigate(`/gallery/${id}`);
    } catch (err) {
      console.error(err);
      alert("Failed to update artwork");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <p className="text-center text-gray-500 mt-20">Loading...</p>;
  }

  return (
    <div className="min-h-screen px-6 py-10 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-serif text-3xl font-bold text-gray-900">Edit Artwork</h1>
        <Link
          to={`/gallery/${id}`}
          className="px-5 py-2 border-2 border-gray-300 text-gray-700 rounded-md text-sm font-medium hover:border-gray-500 transition-colors"
        >
          &larr; Cancel
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
          {currentImage && (
            <div className="mb-3">
              <p className="text-xs text-gray-400 mb-1">Current image:</p>
              <img
                src={`${UPLOADS_URL}/${currentImage}`}
                alt="Current artwork"
                className="h-32 object-cover rounded-lg"
              />
            </div>
          )}
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setImage(e.target.files?.[0] || null)}
            className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-accent file:text-white hover:file:bg-indigo-600 file:cursor-pointer"
          />
          <p className="text-xs text-gray-400 mt-1">Leave empty to keep current image</p>
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3 bg-accent text-white rounded-lg font-medium hover:bg-indigo-600 transition-colors disabled:opacity-50"
        >
          {submitting ? "Saving..." : "Save Changes"}
        </button>
      </form>
    </div>
  );
}
