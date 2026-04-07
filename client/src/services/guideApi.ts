import { apiFetch, API_URL } from "./api";

const API_BASE = `${API_URL}/api/guides`;

export interface Guide {
  id: number;
  name: string;
  description: string;
  personality: string;
  response_guidelines: string;
  voice: string;
  knowledge: string;
  icon: string;
  hidden: boolean;
  created_at: string;
}

export async function getAllGuides(includeHidden?: boolean): Promise<Guide[]> {
  const url = includeHidden ? `${API_BASE}?includeHidden=true` : API_BASE;
  const res = await apiFetch(url);
  if (!res.ok) throw new Error("Failed to fetch guides");
  return res.json();
}

export async function getGuide(id: number): Promise<Guide> {
  const res = await apiFetch(`${API_BASE}/${id}`);
  if (!res.ok) throw new Error("Failed to fetch guide");
  return res.json();
}

export async function createGuide(data: { name: string; description: string; personality: string; response_guidelines: string; voice: string; knowledge: string; icon: string; hidden: boolean }): Promise<Guide> {
  const res = await apiFetch(API_BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create guide");
  return res.json();
}

export async function updateGuide(id: number, data: { name: string; description: string; personality: string; response_guidelines: string; voice: string; knowledge: string; icon: string; hidden: boolean }): Promise<Guide> {
  const res = await apiFetch(`${API_BASE}/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update guide");
  return res.json();
}

export async function deleteGuide(id: number): Promise<void> {
  const res = await apiFetch(`${API_BASE}/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete guide");
}
