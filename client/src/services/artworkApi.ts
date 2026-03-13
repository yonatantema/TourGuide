const API_URL = import.meta.env.VITE_API_URL || "";
const API_BASE = `${API_URL}/api/artworks`;
export const UPLOADS_URL = `${API_URL}/uploads`;

export interface Artwork {
  id: number;
  artist_name: string;
  artwork_name: string;
  artwork_info: string;
  image_filename: string;
  created_at: string;
}

export async function getAllArtworks(): Promise<Artwork[]> {
  const res = await fetch(API_BASE);
  if (!res.ok) throw new Error("Failed to fetch artworks");
  return res.json();
}

export async function getArtwork(id: number): Promise<Artwork> {
  const res = await fetch(`${API_BASE}/${id}`);
  if (!res.ok) throw new Error("Failed to fetch artwork");
  return res.json();
}

export async function createArtwork(formData: FormData): Promise<Artwork> {
  const res = await fetch(API_BASE, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) throw new Error("Failed to create artwork");
  return res.json();
}

export async function updateArtwork(id: number, formData: FormData): Promise<Artwork> {
  const res = await fetch(`${API_BASE}/${id}`, {
    method: "PUT",
    body: formData,
  });
  if (!res.ok) throw new Error("Failed to update artwork");
  return res.json();
}

export async function deleteArtwork(id: number): Promise<void> {
  const res = await fetch(`${API_BASE}/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete artwork");
}

export interface RecognizeResult {
  recognized: boolean;
  artworkId?: number;
}

export async function recognizeArtwork(imageDataUrl: string): Promise<RecognizeResult> {
  const res = await fetch(`${API_URL}/api/recognize`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image: imageDataUrl }),
  });
  if (!res.ok) throw new Error("Failed to recognize artwork");
  return res.json();
}
