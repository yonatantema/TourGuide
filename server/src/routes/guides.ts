import { Router, Request, Response } from "express";
import pool from "../db";

const router = Router();

// GET /api/guides — List all guides for the user's org
router.get("/", async (req: Request, res: Response) => {
  try {
    const includeHidden = req.query.includeHidden === "true";
    const query = includeHidden
      ? "SELECT * FROM guides WHERE org_id = $1 ORDER BY hidden ASC, created_at DESC"
      : "SELECT * FROM guides WHERE org_id = $1 AND hidden = false ORDER BY created_at DESC";
    const result = await pool.query(query, [req.orgId]);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch guides" });
  }
});

// GET /api/guides/:id — Get single guide (scoped to org)
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      "SELECT * FROM guides WHERE id = $1 AND org_id = $2",
      [id, req.orgId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Guide not found" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch guide" });
  }
});

// POST /api/guides — Create guide
router.post("/", async (req: Request, res: Response) => {
  try {
    const { name, description, personality, response_guidelines, voice, knowledge, icon, hidden } = req.body;
    const result = await pool.query(
      "INSERT INTO guides (name, description, personality, response_guidelines, voice, knowledge, icon, hidden, org_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *",
      [name, description, personality, response_guidelines, voice || "coral", knowledge || "internal", icon || "art-expert", hidden || false, req.orgId]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create guide" });
  }
});

// PUT /api/guides/:id — Update guide (scoped to org)
router.put("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, personality, response_guidelines, voice, knowledge, icon, hidden } = req.body;

    const existing = await pool.query(
      "SELECT * FROM guides WHERE id = $1 AND org_id = $2",
      [id, req.orgId]
    );
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: "Guide not found" });
    }

    const result = await pool.query(
      "UPDATE guides SET name = $1, description = $2, personality = $3, response_guidelines = $4, voice = $5, knowledge = $6, icon = $7, hidden = $8 WHERE id = $9 AND org_id = $10 RETURNING *",
      [name, description, personality, response_guidelines, voice || "coral", knowledge || "internal", icon || "art-expert", hidden || false, id, req.orgId]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update guide" });
  }
});

// DELETE /api/guides/:id — Delete guide (scoped to org)
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      "SELECT * FROM guides WHERE id = $1 AND org_id = $2",
      [id, req.orgId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Guide not found" });
    }

    await pool.query("DELETE FROM guides WHERE id = $1 AND org_id = $2", [
      id,
      req.orgId,
    ]);
    res.json({ message: "Guide deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete guide" });
  }
});

export default router;
