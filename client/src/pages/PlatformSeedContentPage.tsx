import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  listSeedArtworks,
  createSeedArtwork,
  updateSeedArtwork,
  deleteSeedArtwork,
  listSeedGuides,
  createSeedGuide,
  updateSeedGuide,
  deleteSeedGuide,
  SeedArtwork,
  SeedGuide,
} from "../services/platformApi";

type Tab = "artworks" | "guides";

const blankArtwork: Omit<SeedArtwork, "id"> = {
  artist_name: "",
  artwork_name: "",
  artwork_info: "",
  image_filename: "",
  visual_analysis: null,
};

const blankGuide: Omit<SeedGuide, "id"> = {
  name: "",
  description: "",
  personality: "",
  response_guidelines: "",
  voice: "coral",
  knowledge: "internal",
  icon: "art-expert",
  hidden: false,
};

export default function PlatformSeedContentPage() {
  const [tab, setTab] = useState<Tab>("artworks");

  return (
    <div className="min-h-screen px-6 py-10 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-serif text-3xl font-bold text-gray-900">Seed Content</h1>
        <Link
          to="/platform"
          className="px-5 py-2 border-2 border-gray-300 text-gray-700 rounded-md text-sm font-medium hover:border-gray-500 transition-colors"
        >
          &larr; Back
        </Link>
      </div>
      <p className="text-gray-500 text-sm mb-6">
        These rows are cloned into every new customer's org when they tick "Seed sample data" at signup.
      </p>

      <div className="flex gap-2 mb-6">
        <button
          type="button"
          onClick={() => setTab("artworks")}
          className={`px-4 py-2 rounded-md text-sm font-medium ${
            tab === "artworks" ? "bg-accent text-white" : "bg-white border border-gray-300 text-gray-700"
          }`}
        >
          Seed Artworks
        </button>
        <button
          type="button"
          onClick={() => setTab("guides")}
          className={`px-4 py-2 rounded-md text-sm font-medium ${
            tab === "guides" ? "bg-accent text-white" : "bg-white border border-gray-300 text-gray-700"
          }`}
        >
          Seed Guides
        </button>
      </div>

      {tab === "artworks" ? <SeedArtworkSection /> : <SeedGuideSection />}
    </div>
  );
}

function SeedArtworkSection() {
  const [rows, setRows] = useState<SeedArtwork[]>([]);
  const [editingId, setEditingId] = useState<number | "new" | null>(null);
  const [draft, setDraft] = useState<Omit<SeedArtwork, "id">>(blankArtwork);
  const [error, setError] = useState<string | null>(null);

  const reload = () => listSeedArtworks().then(setRows).catch((e) => setError(e.message));

  useEffect(() => {
    reload();
  }, []);

  const startEdit = (row: SeedArtwork) => {
    setEditingId(row.id);
    setDraft({
      artist_name: row.artist_name,
      artwork_name: row.artwork_name,
      artwork_info: row.artwork_info,
      image_filename: row.image_filename,
      visual_analysis: row.visual_analysis,
    });
  };

  const startNew = () => {
    setEditingId("new");
    setDraft(blankArtwork);
  };

  const save = async () => {
    setError(null);
    try {
      if (editingId === "new") await createSeedArtwork(draft);
      else if (editingId !== null) await updateSeedArtwork(editingId, draft);
      setEditingId(null);
      reload();
    } catch (err: any) {
      setError(err.message || "Save failed");
    }
  };

  const remove = async (id: number) => {
    if (!confirm("Delete this seed artwork? Existing orgs that already have it cloned won't be affected.")) return;
    try {
      await deleteSeedArtwork(id);
      reload();
    } catch (err: any) {
      setError(err.message || "Delete failed");
    }
  };

  return (
    <div className="space-y-4">
      {error && <p className="text-red-600 text-sm">{error}</p>}

      <div className="bg-cream rounded-xl border-2 border-gray-300 divide-y divide-gray-200">
        {rows.length === 0 && (
          <p className="p-4 text-gray-500 text-sm">No seed artworks yet.</p>
        )}
        {rows.map((row) => (
          <div key={row.id} className="p-4 flex items-center justify-between">
            <div>
              <div className="font-medium text-gray-900">{row.artwork_name}</div>
              <div className="text-sm text-gray-500">{row.artist_name}</div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => startEdit(row)}
                className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => remove(row.id)}
                className="px-3 py-1 text-sm border border-red-300 text-red-600 rounded hover:bg-red-50"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {editingId === null ? (
        <button
          type="button"
          onClick={startNew}
          className="px-4 py-2 bg-accent text-white rounded-lg font-medium hover:opacity-90"
        >
          + Add seed artwork
        </button>
      ) : (
        <div className="bg-cream rounded-xl border-2 border-gray-300 p-6 space-y-4">
          <h3 className="font-serif text-lg font-bold">{editingId === "new" ? "New seed artwork" : "Edit seed artwork"}</h3>
          <Field label="Artist name" value={draft.artist_name} onChange={(v) => setDraft({ ...draft, artist_name: v })} />
          <Field label="Artwork name" value={draft.artwork_name} onChange={(v) => setDraft({ ...draft, artwork_name: v })} />
          <Field
            label="Image filename"
            value={draft.image_filename}
            onChange={(v) => setDraft({ ...draft, image_filename: v })}
            hint="Must already exist in the server uploads directory."
          />
          <TextareaField
            label="Artwork info"
            rows={6}
            value={draft.artwork_info}
            onChange={(v) => setDraft({ ...draft, artwork_info: v })}
          />
          <TextareaField
            label="Visual analysis (optional)"
            rows={6}
            value={draft.visual_analysis ?? ""}
            onChange={(v) => setDraft({ ...draft, visual_analysis: v || null })}
            hint="Pre-computed vision-model description. Leave blank to skip."
          />
          <div className="flex gap-2">
            <button type="button" onClick={save} className="px-5 py-2 bg-accent text-white rounded-lg font-medium hover:opacity-90">
              Save
            </button>
            <button
              type="button"
              onClick={() => setEditingId(null)}
              className="px-5 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function SeedGuideSection() {
  const [rows, setRows] = useState<SeedGuide[]>([]);
  const [editingId, setEditingId] = useState<number | "new" | null>(null);
  const [draft, setDraft] = useState<Omit<SeedGuide, "id">>(blankGuide);
  const [error, setError] = useState<string | null>(null);

  const reload = () => listSeedGuides().then(setRows).catch((e) => setError(e.message));

  useEffect(() => {
    reload();
  }, []);

  const startEdit = (row: SeedGuide) => {
    setEditingId(row.id);
    setDraft({
      name: row.name,
      description: row.description,
      personality: row.personality,
      response_guidelines: row.response_guidelines,
      voice: row.voice,
      knowledge: row.knowledge,
      icon: row.icon,
      hidden: row.hidden,
    });
  };

  const startNew = () => {
    setEditingId("new");
    setDraft(blankGuide);
  };

  const save = async () => {
    setError(null);
    try {
      if (editingId === "new") await createSeedGuide(draft);
      else if (editingId !== null) await updateSeedGuide(editingId, draft);
      setEditingId(null);
      reload();
    } catch (err: any) {
      setError(err.message || "Save failed");
    }
  };

  const remove = async (id: number) => {
    if (!confirm("Delete this seed guide?")) return;
    try {
      await deleteSeedGuide(id);
      reload();
    } catch (err: any) {
      setError(err.message || "Delete failed");
    }
  };

  return (
    <div className="space-y-4">
      {error && <p className="text-red-600 text-sm">{error}</p>}

      <div className="bg-cream rounded-xl border-2 border-gray-300 divide-y divide-gray-200">
        {rows.length === 0 && (
          <p className="p-4 text-gray-500 text-sm">No seed guides yet.</p>
        )}
        {rows.map((row) => (
          <div key={row.id} className="p-4 flex items-center justify-between">
            <div>
              <div className="font-medium text-gray-900">{row.name}</div>
              <div className="text-sm text-gray-500">{row.description}</div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => startEdit(row)}
                className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => remove(row.id)}
                className="px-3 py-1 text-sm border border-red-300 text-red-600 rounded hover:bg-red-50"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {editingId === null ? (
        <button
          type="button"
          onClick={startNew}
          className="px-4 py-2 bg-accent text-white rounded-lg font-medium hover:opacity-90"
        >
          + Add seed guide
        </button>
      ) : (
        <div className="bg-cream rounded-xl border-2 border-gray-300 p-6 space-y-4">
          <h3 className="font-serif text-lg font-bold">{editingId === "new" ? "New seed guide" : "Edit seed guide"}</h3>
          <Field label="Name" value={draft.name} onChange={(v) => setDraft({ ...draft, name: v })} />
          <Field label="Description" value={draft.description} onChange={(v) => setDraft({ ...draft, description: v })} />
          <TextareaField label="Personality" rows={5} value={draft.personality} onChange={(v) => setDraft({ ...draft, personality: v })} />
          <TextareaField label="Response guidelines" rows={5} value={draft.response_guidelines} onChange={(v) => setDraft({ ...draft, response_guidelines: v })} />
          <SelectField
            label="Voice"
            value={draft.voice}
            onChange={(v) => setDraft({ ...draft, voice: v })}
            options={[
              { value: "coral", label: "Coral" },
              { value: "ash", label: "Ash" },
              { value: "marin", label: "Marin" },
            ]}
          />
          <SelectField
            label="Knowledge"
            value={draft.knowledge}
            onChange={(v) => setDraft({ ...draft, knowledge: v })}
            options={[
              { value: "internal", label: "Internal" },
              { value: "external", label: "External" },
            ]}
          />
          <Field label="Icon key" value={draft.icon} onChange={(v) => setDraft({ ...draft, icon: v })} />
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="seed-guide-hidden"
              checked={draft.hidden}
              onChange={(e) => setDraft({ ...draft, hidden: e.target.checked })}
              className="w-4 h-4 accent-accent"
            />
            <label htmlFor="seed-guide-hidden" className="text-sm text-gray-700">Hidden by default</label>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={save} className="px-5 py-2 bg-accent text-white rounded-lg font-medium hover:opacity-90">
              Save
            </button>
            <button
              type="button"
              onClick={() => setEditingId(null)}
              className="px-5 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, onChange, hint }: { label: string; value: string; onChange: (v: string) => void; hint?: string }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {hint && <p className="text-xs text-gray-500 mb-2">{hint}</p>}
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
      />
    </div>
  );
}

function TextareaField({ label, value, onChange, rows, hint }: { label: string; value: string; onChange: (v: string) => void; rows: number; hint?: string }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {hint && <p className="text-xs text-gray-500 mb-2">{hint}</p>}
      <textarea
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent resize-vertical"
      />
    </div>
  );
}

function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent bg-white"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  );
}
