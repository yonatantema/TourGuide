const API_URL = import.meta.env.VITE_API_URL || "";
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
  created_at: string;
}

export async function getAllGuides(): Promise<Guide[]> {
  const res = await fetch(API_BASE);
  if (!res.ok) throw new Error("Failed to fetch guides");
  return res.json();
}

export async function getGuide(id: number): Promise<Guide> {
  const res = await fetch(`${API_BASE}/${id}`);
  if (!res.ok) throw new Error("Failed to fetch guide");
  return res.json();
}

export async function createGuide(data: { name: string; description: string; personality: string; response_guidelines: string; voice: string; knowledge: string; icon: string }): Promise<Guide> {
  const res = await fetch(API_BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create guide");
  return res.json();
}

export async function updateGuide(id: number, data: { name: string; description: string; personality: string; response_guidelines: string; voice: string; knowledge: string; icon: string }): Promise<Guide> {
  const res = await fetch(`${API_BASE}/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update guide");
  return res.json();
}

export async function deleteGuide(id: number): Promise<void> {
  const res = await fetch(`${API_BASE}/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete guide");
}
