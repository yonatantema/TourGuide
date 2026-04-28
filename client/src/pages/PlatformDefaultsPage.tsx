import { Link } from "react-router-dom";
import SettingsForm, { SettingFieldSpec } from "../components/SettingsForm";

const FIELDS: SettingFieldSpec[] = [
  {
    key: "defaults.voice",
    label: "Default voice",
    hint: "Used when a guide is created without a voice and as the realtime fallback.",
    field: {
      kind: "select",
      options: [
        { value: "coral", label: "Coral" },
        { value: "ash", label: "Ash" },
        { value: "marin", label: "Marin" },
      ],
    },
  },
  {
    key: "defaults.knowledge",
    label: "Default knowledge mode",
    field: {
      kind: "select",
      options: [
        { value: "internal", label: "Internal (museum knowledge only)" },
        { value: "external", label: "External (also draws on broader art knowledge)" },
      ],
    },
  },
  {
    key: "defaults.icon",
    label: "Default icon key",
    hint: "Must match a key in client/src/assets/guide-icons (e.g. art-expert).",
    field: { kind: "text" },
  },
];

export default function PlatformDefaultsPage() {
  return (
    <div className="min-h-screen px-6 py-10 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-serif text-3xl font-bold text-gray-900">Defaults for New Guides</h1>
        <Link
          to="/platform"
          className="px-5 py-2 border-2 border-gray-300 text-gray-700 rounded-md text-sm font-medium hover:border-gray-500 transition-colors"
        >
          &larr; Back
        </Link>
      </div>
      <SettingsForm fields={FIELDS} />
    </div>
  );
}
