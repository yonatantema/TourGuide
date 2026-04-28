import { Link } from "react-router-dom";
import SettingsForm, { SettingFieldSpec } from "../components/SettingsForm";

const FIELDS: SettingFieldSpec[] = [
  {
    key: "limits.artwork_creation_per_month",
    label: "Artwork creations per user per month",
    field: { kind: "number" },
  },
  {
    key: "limits.image_recognition_per_month",
    label: "Image recognitions per user per month",
    field: { kind: "number" },
  },
  {
    key: "limits.conversation_seconds_per_month",
    label: "Conversation seconds per user per month",
    hint: "Total spoken time across all sessions. 600 = 10 minutes.",
    field: { kind: "number" },
  },
  {
    key: "limits.session_max_seconds",
    label: "Per-session ceiling (seconds)",
    hint: "Hard cap clamped server-side regardless of how long the client claims.",
    field: { kind: "number" },
  },
];

export default function PlatformLimitsPage() {
  return (
    <div className="min-h-screen px-6 py-10 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-serif text-3xl font-bold text-gray-900">Usage Limits</h1>
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
