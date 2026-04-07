const API_URL = import.meta.env.VITE_API_URL || "";

export { API_URL };

export async function apiFetch(
  input: string,
  init?: RequestInit
): Promise<Response> {
  const res = await fetch(input, {
    ...init,
    credentials: "include",
  });
  if (res.status === 401) {
    window.location.href = "/login";
    throw new Error("Authentication required");
  }
  if (res.status === 403) {
    const data = await res.clone().json().catch(() => null);
    if (data?.code === "NEEDS_SETUP") {
      window.location.href = "/setup";
      throw new Error("Account setup required");
    }
  }
  return res;
}
