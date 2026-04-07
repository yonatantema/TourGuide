import { apiFetch, API_URL } from "./api";

export async function createRealtimeSession(
  guideId: number,
  artworkId: number,
  language: string
): Promise<{ clientSecret: string; expiresAt: number }> {
  const res = await apiFetch(`${API_URL}/api/conversation/session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ guideId, artworkId, language }),
  });
  if (!res.ok) throw new Error("Failed to create conversation session");
  return res.json();
}
