import pool from "../db";

// In-process cache of platform_settings rows. Refreshed on a 60s TTL and
// invalidated explicitly by the platform admin PUT endpoint after a write.
// Defaults are passed by every getter so a missing row never crashes a
// request — even if the table is empty (e.g., right after a fresh deploy
// before the seed INSERTs in init.sql have run).

const TTL_MS = 60_000;

let cache: Map<string, string> | null = null;
let cacheLoadedAt = 0;
let pendingLoad: Promise<void> | null = null;

async function loadFromDb(): Promise<void> {
  const result = await pool.query<{ key: string; value: string }>(
    "SELECT key, value FROM platform_settings"
  );
  const next = new Map<string, string>();
  for (const row of result.rows) {
    next.set(row.key, row.value);
  }
  cache = next;
  cacheLoadedAt = Date.now();
}

async function ensureCache(): Promise<void> {
  if (cache && Date.now() - cacheLoadedAt < TTL_MS) return;
  if (pendingLoad) {
    await pendingLoad;
    return;
  }
  pendingLoad = loadFromDb().finally(() => {
    pendingLoad = null;
  });
  try {
    await pendingLoad;
  } catch (err) {
    console.error("Failed to load platform_settings; using defaults:", err);
    // Leave cache as-is (possibly null) — getters will return defaults.
  }
}

export function invalidatePlatformSettingsCache(): void {
  cache = null;
  cacheLoadedAt = 0;
}

export async function getString(
  key: string,
  defaultValue: string
): Promise<string> {
  await ensureCache();
  return cache?.get(key) ?? defaultValue;
}

export async function getNumber(
  key: string,
  defaultValue: number
): Promise<number> {
  await ensureCache();
  const raw = cache?.get(key);
  if (raw === undefined) return defaultValue;
  const n = Number(raw);
  return Number.isFinite(n) ? n : defaultValue;
}
