import { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { getArtwork, Artwork, UPLOADS_URL } from "../services/artworkApi";

export default function PublicArtworkPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [artwork, setArtwork] = useState<Artwork | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    getArtwork(Number(id))
      .then(setArtwork)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return <p className="text-center text-gray-500 mt-20">Loading...</p>;
  }

  if (!artwork) {
    return <p className="text-center text-gray-500 mt-20">Artwork not found</p>;
  }

  return (
    <div className="min-h-screen px-6 py-10 max-w-4xl mx-auto">
      <div className="mb-8">
        <button
          onClick={() => {
            if (location.state?.guideId) {
              navigate(`/guides/${location.state.guideId}`, { state: { restoredArtwork: location.state.artwork } });
            } else {
              navigate(-1);
            }
          }}
          className="px-5 py-2 border-2 border-gray-300 text-gray-700 rounded-md text-sm font-medium hover:border-gray-500 transition-colors cursor-pointer"
        >
          &larr; Back
        </button>
      </div>

      <div className="bg-cream rounded-xl border-2 border-gray-300 p-6 md:p-8">
        <h1 className="font-serif text-2xl font-bold text-gray-900 mb-1 text-center">
          {artwork.artwork_name}
        </h1>
        <p className="text-center text-gray-500 mb-6">{artwork.artist_name}</p>
        <img
          src={`${UPLOADS_URL}/${artwork.image_filename}`}
          alt={artwork.artwork_name}
          className="w-full max-h-[500px] object-contain rounded-lg mb-8"
        />
        <div>
          <h2 className="font-serif text-xl font-semibold text-gray-900 mb-3">
            About the Artwork
          </h2>
          <div className="border-2 border-gray-300 rounded-lg p-4 text-gray-600 leading-relaxed whitespace-pre-wrap">
            {artwork.artwork_info}
          </div>
        </div>
      </div>
    </div>
  );
}
