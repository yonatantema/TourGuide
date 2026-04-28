import { Link } from "react-router-dom";
import SettingsForm, { SettingFieldSpec } from "../components/SettingsForm";

const FIELDS: SettingFieldSpec[] = [
  {
    key: "model.realtime",
    label: "Realtime model (conversation)",
    hint: "OpenAI Realtime model used to stream guide audio. e.g. gpt-realtime-1.5",
    field: { kind: "text" },
  },
  {
    key: "model.transcription",
    label: "Transcription model",
    hint: "Used to transcribe the visitor's mic input. e.g. gpt-4o-transcribe",
    field: { kind: "text" },
  },
  {
    key: "model.recognition",
    label: "Recognition model (artwork ID from photo)",
    hint: "Vision model used by /api/recognize. e.g. gpt-4o",
    field: { kind: "text" },
  },
  {
    key: "model.recognition.temperature",
    label: "Recognition temperature",
    hint: "0 = deterministic. Lower means stricter matches.",
    field: { kind: "number" },
  },
  {
    key: "model.recognition.max_tokens",
    label: "Recognition max tokens",
    hint: "Cap on response size. Recognition only returns a small JSON tool call.",
    field: { kind: "number" },
  },
  {
    key: "prompt.recognition.system",
    label: "Recognition system prompt",
    field: { kind: "textarea", rows: 5 },
  },
  {
    key: "model.visual_analysis",
    label: "Visual analysis model",
    hint: "Vision model used to pre-describe new artworks. e.g. gpt-4o",
    field: { kind: "text" },
  },
  {
    key: "model.visual_analysis.temperature",
    label: "Visual analysis temperature",
    field: { kind: "number" },
  },
  {
    key: "model.visual_analysis.max_tokens",
    label: "Visual analysis max tokens",
    hint: "Long-form description; default 1500.",
    field: { kind: "number" },
  },
  {
    key: "prompt.visual_analysis",
    label: "Visual analysis prompt",
    hint: "Sent to the vision model when a new artwork is uploaded.",
    field: { kind: "textarea", rows: 12 },
  },
];

export default function PlatformModelsPage() {
  return (
    <div className="min-h-screen px-6 py-10 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-serif text-3xl font-bold text-gray-900">Models & Hyperparameters</h1>
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
