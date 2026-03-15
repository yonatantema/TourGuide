import { useState, FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { createGuide } from "../services/guideApi";

export default function AddGuidePage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [personality, setPersonality] = useState("");
  const [responseGuidelines, setResponseGuidelines] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const guide = await createGuide({
        name,
        description,
        personality,
        response_guidelines: responseGuidelines,
      });
      navigate(`/guidelines/${guide.id}`);
    } catch (err) {
      console.error(err);
      alert("Failed to add guide");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen px-6 py-10 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-serif text-3xl font-bold text-gray-900">Add Guide</h1>
        <Link
          to="/guidelines"
          className="px-5 py-2 border-2 border-gray-300 text-gray-700 rounded-md text-sm font-medium hover:border-gray-500 transition-colors"
        >
          &larr; Back to Guidelines
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
          {submitting ? "Adding..." : "Add Guide"}
        </button>
      </form>
    </div>
  );
}
