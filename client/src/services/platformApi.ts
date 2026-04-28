import { API_URL, apiFetch } from "./api";

const BASE = `${API_URL}/api/platform`;

export interface PlatformSetting {
  key: string;
  value: string;
  updated_at: string;
  updated_by: string | null;
}

export interface SeedArtwork {
  id: number;
  artist_name: string;
  artwork_name: string;
  artwork_info: string;
  image_filename: string;
  visual_analysis: string | null;
}

export interface SeedGuide {
  id: number;
  name: string;
  description: string;
  personality: string;
  response_guidelines: string;
  voice: string;
  knowledge: string;
  icon: string;
  hidden: boolean;
}

export interface PlatformAdmin {
  id: string;
  email: string;
  name: string;
  picture: string | null;
  created_at: string;
}

async function asJson<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

// ----- settings -----

export async function listSettings(): Promise<PlatformSetting[]> {
  return asJson(await apiFetch(`${BASE}/settings`));
}

export async function updateSetting(
  key: string,
  value: string
): Promise<PlatformSetting> {
  return asJson(
    await apiFetch(`${BASE}/settings/${encodeURIComponent(key)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value }),
    })
  );
}

// ----- seed artworks -----

export async function listSeedArtworks(): Promise<SeedArtwork[]> {
  return asJson(await apiFetch(`${BASE}/seed-artworks`));
}

export async function createSeedArtwork(
  payload: Omit<SeedArtwork, "id">
): Promise<SeedArtwork> {
  return asJson(
    await apiFetch(`${BASE}/seed-artworks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
  );
}

export async function updateSeedArtwork(
  id: number,
  payload: Omit<SeedArtwork, "id">
): Promise<SeedArtwork> {
  return asJson(
    await apiFetch(`${BASE}/seed-artworks/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
  );
}

export async function deleteSeedArtwork(id: number): Promise<void> {
  await asJson(
    await apiFetch(`${BASE}/seed-artworks/${id}`, { method: "DELETE" })
  );
}

// ----- seed guides -----

export async function listSeedGuides(): Promise<SeedGuide[]> {
  return asJson(await apiFetch(`${BASE}/seed-guides`));
}

export async function createSeedGuide(
  payload: Omit<SeedGuide, "id">
): Promise<SeedGuide> {
  return asJson(
    await apiFetch(`${BASE}/seed-guides`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
  );
}

export async function updateSeedGuide(
  id: number,
  payload: Omit<SeedGuide, "id">
): Promise<SeedGuide> {
  return asJson(
    await apiFetch(`${BASE}/seed-guides/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
  );
}

export async function deleteSeedGuide(id: number): Promise<void> {
  await asJson(
    await apiFetch(`${BASE}/seed-guides/${id}`, { method: "DELETE" })
  );
}

// ----- admins -----

export async function listAdmins(): Promise<PlatformAdmin[]> {
  return asJson(await apiFetch(`${BASE}/admins`));
}

export async function promoteAdmin(email: string): Promise<PlatformAdmin> {
  return asJson(
    await apiFetch(`${BASE}/admins/promote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    })
  );
}

export async function demoteAdmin(userId: string): Promise<PlatformAdmin> {
  return asJson(
    await apiFetch(`${BASE}/admins/demote/${userId}`, { method: "POST" })
  );
}
