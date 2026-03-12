import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getAllArtworks, Artwork, UPLOADS_URL } from "../services/artworkApi";

export default function GalleryPage() {
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAllArtworks()
      .then(setArtworks)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen px-6 py-10 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="font-serif text-5xl font-bold text-gray-900">Art Gallery</h1>
          <p className="text-gray-500 mt-2">Explore our stunning art collection</p>
        </div>
        <div className="flex gap-3 mt-4 sm:mt-0">
          <Link
            to="/admin"
            className="px-5 py-2 border-2 border-gray-300 text-gray-700 rounded-md text-sm font-medium hover:border-gray-500 transition-colors"
          >
            &larr; Back to Admin
          </Link>
          <Link
            to="/gallery/add"
            className="px-5 py-2 bg-accent text-white rounded-md text-sm font-medium hover:bg-indigo-600 transition-colors"
          >
            + Add Artwork
          </Link>
        </div>
      </div>

      {loading ? (
        <p className="text-center text-gray-500 mt-20">Loading artworks...</p>
      ) : artworks.length === 0 ? (
        <p className="text-center text-gray-500 mt-20">No artworks yet. Add your first one!</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {artworks.map((artwork) => (
            <Link
              key={artwork.id}
              to={`/gallery/${artwork.id}`}
              className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow"
            >
              <img
                src={`${UPLOADS_URL}/${artwork.image_filename}`}
                alt={artwork.artwork_name}
                className="w-full h-72 object-cover"
              />
              <div className="p-3">
                <h3 className="font-semibold text-gray-900 truncate text-sm">{artwork.artwork_name}</h3>
                <p className="text-xs text-gray-500">{artwork.artist_name}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
