import { Router, Request, Response } from "express";
import pool from "../db";

const router = Router();

// GET /api/guides — List all guides
router.get("/", async (_req: Request, res: Response) => {
  try {
    const result = await pool.query("SELECT * FROM guides ORDER BY created_at DESC");
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch guides" });
  }
});

// GET /api/guides/:id — Get single guide
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query("SELECT * FROM guides WHERE id = $1", [id]);
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
    const { name, personality, response_guidelines } = req.body;
    const result = await pool.query(
      "INSERT INTO guides (name, personality, response_guidelines) VALUES ($1, $2, $3) RETURNING *",
      [name, personality, response_guidelines]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create guide" });
  }
});

// PUT /api/guides/:id — Update guide
router.put("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, personality, response_guidelines } = req.body;

    const existing = await pool.query("SELECT * FROM guides WHERE id = $1", [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: "Guide not found" });
    }

    const result = await pool.query(
      "UPDATE guides SET name = $1, personality = $2, response_guidelines = $3 WHERE id = $4 RETURNING *",
      [name, personality, response_guidelines, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update guide" });
  }
});

// DELETE /api/guides/:id — Delete guide
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query("SELECT * FROM guides WHERE id = $1", [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Guide not found" });
    }

    await pool.query("DELETE FROM guides WHERE id = $1", [id]);
    res.json({ message: "Guide deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete guide" });
  }
});

export default router;
