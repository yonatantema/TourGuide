import { useState, useEffect, FormEvent } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { getGuide, updateGuide } from "../services/guideApi";

export default function EditGuidePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [personality, setPersonality] = useState("");
  const [responseGuidelines, setResponseGuidelines] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!id) return;
    getGuide(Number(id))
      .then((guide) => {
        setName(guide.name);
        setDescription(guide.description);
        setPersonality(guide.personality);
        setResponseGuidelines(guide.response_guidelines);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setSubmitting(true);
    try {
      await updateGuide(Number(id), {
        name,
        description,
        personality,
        response_guidelines: responseGuidelines,
      });
      navigate(`/guidelines/${id}`);
    } catch (err) {
      console.error(err);
      alert("Failed to update guide");
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
        <h1 className="font-serif text-3xl font-bold text-gray-900">Edit Guide</h1>
        <Link
          to={`/guidelines/${id}`}
          className="px-5 py-2 border-2 border-gray-300 text-gray-700 rounded-md text-sm font-medium hover:border-gray-500 transition-colors"
        >
          &larr; Cancel
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="bg-cream rounded-xl border-2 border-gray-300 p-6 md:p-8 space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Guide Name</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Guide Description</label>
          <p className="text-xs text-gray-500 mb-2">A short description of this guide</p>
          <input
            type="text"
            required
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Guide Personality and General Instructions</label>
          <p className="text-xs text-gray-500 mb-2">Define the guide's style and personality</p>
          <textarea
            required
            rows={5}
            value={personality}
            onChange={(e) => setPersonality(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent resize-vertical"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Special Response Guidelines</label>
          <p className="text-xs text-gray-500 mb-2">Add specific instructions for how to respond</p>
          <textarea
            required
            rows={5}
            value={responseGuidelines}
            onChange={(e) => setResponseGuidelines(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent resize-vertical"
          />
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
