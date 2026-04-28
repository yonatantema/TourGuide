import { Router, Request, Response } from "express";
import pool from "../../db";
import { invalidatePlatformSettingsCache } from "../../services/platformSettings";

const router = Router();

router.get("/", async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(
      "SELECT key, value, updated_at, updated_by FROM platform_settings ORDER BY key"
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Platform settings list error:", err);
    res.status(500).json({ error: "Failed to fetch settings" });
  }
});

router.put("/:key", async (req: Request, res: Response) => {
  try {
    const { key } = req.params;
    const { value } = req.body;
    if (typeof value !== "string") {
      return res.status(400).json({ error: "value must be a string" });
    }

    const result = await pool.query(
      `UPDATE platform_settings
       SET value = $1, updated_at = NOW(), updated_by = $2
       WHERE key = $3
       RETURNING key, value, updated_at, updated_by`,
      [value, req.user!.id, key]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Setting not found" });
    }

    invalidatePlatformSettingsCache();
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Platform settings update error:", err);
    res.status(500).json({ error: "Failed to update setting" });
  }
});

export default router;
