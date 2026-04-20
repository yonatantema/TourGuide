import { apiFetch, API_URL } from "./api";

export type UsageData =
  | { unlimited: true }
  | {
      unlimited?: false;
      artwork_creation: { used: number; limit: number };
      image_recognition: { used: number; limit: number };
      conversation_seconds: { used: number; limit: number };
    };

export async function getUsage(): Promise<UsageData> {
  const res = await apiFetch(`${API_URL}/api/usage`);
  if (!res.ok) throw new Error("Failed to fetch usage");
  return res.json();
}
