import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { getArtwork, deleteArtwork, Artwork, UPLOADS_URL } from "../services/artworkApi";

export default function ArtworkDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [artwork, setArtwork] = useState<Artwork | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    getArtwork(Number(id))
      .then(setArtwork)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  const handleDelete = async () => {
    if (!id) return;
    if (!confirm("Are you sure you want to delete this artwork?")) return;
    try {
      await deleteArtwork(Number(id));
      navigate("/gallery");
    } catch (err) {
      console.error(err);
      alert("Failed to delete artwork");
    }
  };

  if (loading) {
    return <p className="text-center text-gray-500 mt-20">Loading...</p>;
  }

  if (!artwork) {
    return <p className="text-center text-gray-500 mt-20">Artwork not found</p>;
  }

  return (
    <div className="min-h-screen px-6 py-10 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <Link
          to="/gallery"
          className="px-5 py-2 border-2 border-gray-300 text-gray-700 rounded-md text-sm font-medium hover:border-gray-500 transition-colors"
        >
          &larr; Back to Gallery
        </Link>
        <button
          onClick={handleDelete}
          className="px-5 py-2 bg-accent text-white rounded-md text-sm font-medium hover:bg-indigo-600 transition-colors"
        >
          Delete Artwork
        </button>
      </div>

      <div className="bg-cream rounded-xl border-2 border-gray-300 p-6 md:p-8">
        <div className="flex items-center justify-between mb-2">
          <h1 className="font-serif text-3xl font-bold text-gray-900">{artwork.artwork_name}</h1>
          <Link
            to={`/gallery/${artwork.id}/edit`}
            className="text-gray-400 hover:text-accent transition-colors"
            title="Edit artwork"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </Link>
        </div>
        <p className="text-center text-gray-500 mb-6">{artwork.artist_name}</p>
        <img
          src={`${UPLOADS_URL}/${artwork.image_filename}`}
          alt={artwork.artwork_name}
          className="w-full max-h-[500px] object-contain rounded-lg mb-8"
        />
        <div>
          <h2 className="font-serif text-xl font-semibold text-gray-900 mb-3">About the Artwork</h2>
          <div className="border-2 border-gray-300 rounded-lg p-4 text-gray-600 leading-relaxed whitespace-pre-wrap">
            {artwork.artwork_info}
          </div>
        </div>
      </div>
    </div>
  );
}
