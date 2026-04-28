import pool from "../db";
import { getNumber } from "./platformSettings";

const ACTIONS = ["artwork_creation", "image_recognition", "conversation_seconds"] as const;
export type ActionType = (typeof ACTIONS)[number];

// Fallback values if platform_settings is empty / unreachable. In normal
// operation the active limits come from platform_settings, seeded by
// init.sql and editable via the Platform Admin UI.
const FALLBACK_LIMITS: Record<ActionType, number> = {
  artwork_creation: 10,
  image_recognition: 30,
  conversation_seconds: 600,
};

const SETTINGS_KEY: Record<ActionType, string> = {
  artwork_creation: "limits.artwork_creation_per_month",
  image_recognition: "limits.image_recognition_per_month",
  conversation_seconds: "limits.conversation_seconds_per_month",
};

export async function getLimit(action: ActionType): Promise<number> {
  return getNumber(SETTINGS_KEY[action], FALLBACK_LIMITS[action]);
}

export async function getAllLimits(): Promise<Record<ActionType, number>> {
  const entries = await Promise.all(
    ACTIONS.map(async (a) => [a, await getLimit(a)] as const)
  );
  return Object.fromEntries(entries) as Record<ActionType, number>;
}

export function isUnlimitedUser(email: string): boolean {
  const domains = (process.env.UNLIMITED_USER_DOMAINS || "")
    .split(",")
    .map((d) => d.trim().toLowerCase())
    .filter(Boolean);
  if (domains.length === 0) return false;
  const emailDomain = email.toLowerCase().split("@")[1];
  return !!emailDomain && domains.includes(emailDomain);
}

export async function getCurrentUsage(
  userId: string,
  action: ActionType
): Promise<number> {
  const now = new Date();
  const result = await pool.query(
    `SELECT count FROM usage_counters WHERE user_id = $1 AND year = $2 AND month = $3 AND action_type = $4`,
    [userId, now.getFullYear(), now.getMonth() + 1, action]
  );
  return result.rows[0]?.count ?? 0;
}

export async function getAllUsage(
  userId: string
): Promise<Record<ActionType, number>> {
  const now = new Date();
  const result = await pool.query(
    `SELECT action_type, count FROM usage_counters WHERE user_id = $1 AND year = $2 AND month = $3`,
    [userId, now.getFullYear(), now.getMonth() + 1]
  );
  const usage: Record<string, number> = {
    artwork_creation: 0,
    image_recognition: 0,
    conversation_seconds: 0,
  };
  for (const row of result.rows) {
    usage[row.action_type] = row.count;
  }
  return usage as Record<ActionType, number>;
}

export async function incrementUsage(
  userId: string,
  email: string,
  action: ActionType,
  amount: number = 1
): Promise<number> {
  if (isUnlimitedUser(email)) return 0;
  const now = new Date();
  const result = await pool.query(
    `INSERT INTO usage_counters (user_id, year, month, action_type, count)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (user_id, year, month, action_type)
     DO UPDATE SET count = usage_counters.count + $5
     RETURNING count`,
    [userId, now.getFullYear(), now.getMonth() + 1, action, amount]
  );
  return result.rows[0].count;
}

export async function checkLimit(
  userId: string,
  email: string,
  action: ActionType
): Promise<{ allowed: boolean; current: number; limit: number }> {
  if (isUnlimitedUser(email)) {
    return { allowed: true, current: 0, limit: Number.MAX_SAFE_INTEGER };
  }
  const current = await getCurrentUsage(userId, action);
  const limit = await getLimit(action);
  return { allowed: current < limit, current, limit };
}
