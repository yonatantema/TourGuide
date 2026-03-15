const API_URL = import.meta.env.VITE_API_URL || "";

export async function createRealtimeSession(
  guideId: number,
  artworkId: number
): Promise<{ clientSecret: string; expiresAt: number }> {
  const res = await fetch(`${API_URL}/api/conversation/session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ guideId, artworkId }),
  });
  if (!res.ok) throw new Error("Failed to create conversation session");
  return res.json();
}
