import { useEffect, useState } from "react";
import {
  listSettings,
  updateSetting,
  PlatformSetting,
} from "../services/platformApi";

export type FieldKind =
  | { kind: "text" }
  | { kind: "textarea"; rows?: number }
  | { kind: "number" }
  | { kind: "select"; options: { value: string; label: string }[] };

export interface SettingFieldSpec {
  key: string;
  label: string;
  hint?: string;
  field: FieldKind;
}

interface Props {
  fields: SettingFieldSpec[];
}

// Generic "load N settings, edit them locally, save the dirty ones" form.
// Used by Prompts, Models, Limits and Defaults pages.
export default function SettingsForm({ fields }: Props) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [original, setOriginal] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listSettings()
      .then((rows: PlatformSetting[]) => {
        if (cancelled) return;
        const map: Record<string, string> = {};
        for (const r of rows) map[r.key] = r.value;
        const next: Record<string, string> = {};
        for (const f of fields) next[f.key] = map[f.key] ?? "";
        setValues(next);
        setOriginal(next);
      })
      .catch((err) => setError(err.message || "Failed to load settings"))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [fields]);

  const dirtyKeys = fields
    .map((f) => f.key)
    .filter((k) => values[k] !== original[k]);

  const handleSave = async () => {
    setSaving(true);
    setStatus(null);
    setError(null);
    try {
      await Promise.all(
        dirtyKeys.map((k) => updateSetting(k, values[k]))
      );
      setOriginal({ ...values });
      setStatus(`Saved ${dirtyKeys.length} change${dirtyKeys.length === 1 ? "" : "s"}.`);
    } catch (err: any) {
      setError(err.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="text-center text-gray-500 mt-10">Loading...</p>;
  }

  return (
    <div className="bg-cream rounded-xl border-2 border-gray-300 p-6 md:p-8 space-y-5">
      {fields.map((f) => (
        <div key={f.key}>
          <label className="block text-sm font-medium text-gray-700 mb-1">{f.label}</label>
          {f.hint && <p className="text-xs text-gray-500 mb-2">{f.hint}</p>}
          {f.field.kind === "text" && (
            <input
              type="text"
              value={values[f.key] ?? ""}
              onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
            />
          )}
          {f.field.kind === "textarea" && (
            <textarea
              rows={f.field.rows ?? 8}
              value={values[f.key] ?? ""}
              onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent resize-vertical font-mono text-sm"
            />
          )}
          {f.field.kind === "number" && (
            <input
              type="number"
              value={values[f.key] ?? ""}
              onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
            />
          )}
          {f.field.kind === "select" && (
            <select
              value={values[f.key] ?? ""}
              onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent bg-white"
            >
              {f.field.options.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          )}
        </div>
      ))}
      <div className="flex items-center justify-between pt-2">
        <div className="text-sm">
          {error && <span className="text-red-600">{error}</span>}
          {status && !error && <span className="text-green-700">{status}</span>}
          {!error && !status && (
            <span className="text-gray-500">
              {dirtyKeys.length === 0 ? "No unsaved changes" : `${dirtyKeys.length} unsaved change${dirtyKeys.length === 1 ? "" : "s"}`}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || dirtyKeys.length === 0}
          className="px-6 py-2 bg-accent text-white rounded-lg font-medium hover:opacity-90 transition-colors disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </div>
  );
}
