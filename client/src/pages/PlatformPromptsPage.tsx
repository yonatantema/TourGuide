import { Link } from "react-router-dom";
import SettingsForm, { SettingFieldSpec } from "../components/SettingsForm";

const FIELDS: SettingFieldSpec[] = [
  {
    key: "prompt.knowledge.external",
    label: "Knowledge instruction — external knowledge mode",
    hint: "Inserted into every conversation when the guide's knowledge mode is 'external'.",
    field: { kind: "textarea", rows: 6 },
  },
  {
    key: "prompt.knowledge.internal",
    label: "Knowledge instruction — internal knowledge mode",
    hint: "Inserted when the guide's knowledge mode is 'internal' (museum-knowledge-only guides).",
    field: { kind: "textarea", rows: 6 },
  },
  {
    key: "prompt.topic.external",
    label: "Topic restriction — external knowledge mode",
    hint: "Limits which topics the guide may discuss when in external mode.",
    field: { kind: "textarea", rows: 6 },
  },
  {
    key: "prompt.topic.internal",
    label: "Topic restriction — internal knowledge mode",
    hint: "Limits which topics the guide may discuss when in internal mode.",
    field: { kind: "textarea", rows: 6 },
  },
  {
    key: "prompt.general.external",
    label: "General instructions — external knowledge mode",
    hint: "Greeting style, IPA pronunciation, empty-input handling, etc. for external guides.",
    field: { kind: "textarea", rows: 8 },
  },
  {
    key: "prompt.general.internal",
    label: "General instructions — internal knowledge mode",
    hint: "Same as above but for internal guides (omits the 'say so when you don't know' line by default).",
    field: { kind: "textarea", rows: 8 },
  },
];

export default function PlatformPromptsPage() {
  return (
    <div className="min-h-screen px-6 py-10 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-serif text-3xl font-bold text-gray-900">Guide Prompts</h1>
        <Link
          to="/platform"
          className="px-5 py-2 border-2 border-gray-300 text-gray-700 rounded-md text-sm font-medium hover:border-gray-500 transition-colors"
        >
          &larr; Back
        </Link>
      </div>
      <p className="text-gray-500 text-sm mb-6">
        Edits take effect on the next conversation in any org.
      </p>
      <SettingsForm fields={FIELDS} />
    </div>
  );
}
