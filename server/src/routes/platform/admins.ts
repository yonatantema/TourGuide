import { Router, Request, Response } from "express";
import pool from "../../db";

const router = Router();

router.get("/", async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT id, email, name, picture, created_at
       FROM users
       WHERE platform_role = 'platform_admin'
       ORDER BY email`
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Platform admins list error:", err);
    res.status(500).json({ error: "Failed to fetch admins" });
  }
});

router.post("/promote", async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email || typeof email !== "string") {
      return res.status(400).json({ error: "email is required" });
    }
    const result = await pool.query(
      `UPDATE users
       SET platform_role = 'platform_admin'
       WHERE email = $1
       RETURNING id, email, name, picture, platform_role`,
      [email]
    );
    if (result.rows.length === 0) {
      return res
        .status(404)
        .json({ error: "No user with that email — they must sign in once first" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Platform admin promote error:", err);
    res.status(500).json({ error: "Failed to promote user" });
  }
});

router.post("/demote/:userId", async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    if (userId === req.user!.id) {
      return res.status(400).json({ error: "Cannot demote yourself" });
    }

    // Guard against demoting the last platform admin.
    const countResult = await pool.query<{ c: string }>(
      "SELECT COUNT(*)::text AS c FROM users WHERE platform_role = 'platform_admin'"
    );
    const adminCount = Number(countResult.rows[0]?.c ?? 0);
    if (adminCount <= 1) {
      return res
        .status(400)
        .json({ error: "Cannot demote the last platform admin" });
    }

    const result = await pool.query(
      `UPDATE users
       SET platform_role = 'user'
       WHERE id = $1 AND platform_role = 'platform_admin'
       RETURNING id, email, name`,
      [userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Admin not found" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Platform admin demote error:", err);
    res.status(500).json({ error: "Failed to demote user" });
  }
});

export default router;
