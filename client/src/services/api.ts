const API_URL = import.meta.env.VITE_API_URL || "";

export { API_URL };

export function getToken(): string | null {
  return localStorage.getItem("token");
}

export function setToken(token: string): void {
  localStorage.setItem("token", token);
}

export function clearToken(): void {
  localStorage.removeItem("token");
}

export async function apiFetch(
  input: string,
  init?: RequestInit
): Promise<Response> {
  const token = getToken();
  const headers = new Headers(init?.headers);
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  const res = await fetch(input, {
    ...init,
    headers,
  });
  if (res.status === 401) {
    clearToken();
    window.location.href = "/login";
    throw new Error("Authentication required");
  }
  if (res.status === 429) {
    const data = await res.clone().json().catch(() => null);
    if (data?.code === "USAGE_LIMIT_REACHED") {
      const err = new Error(data.error || "Usage limit reached") as any;
      err.code = "USAGE_LIMIT_REACHED";
      err.action = data.action;
      err.current = data.current;
      err.limit = data.limit;
      throw err;
    }
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
