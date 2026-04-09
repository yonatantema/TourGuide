import pool from "../db";

export const USAGE_LIMITS = {
  artwork_creation: 10,
  image_recognition: 30,
  conversation_seconds: 600, // 10 minutes
} as const;

export type ActionType = keyof typeof USAGE_LIMITS;

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
  action: ActionType,
  amount: number = 1
): Promise<number> {
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
  action: ActionType
): Promise<{ allowed: boolean; current: number; limit: number }> {
  const current = await getCurrentUsage(userId, action);
  const limit = USAGE_LIMITS[action];
  return { allowed: current < limit, current, limit };
}
