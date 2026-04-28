import { Router, Request, Response } from "express";
import pool from "../../db";

const router = Router();

router.get("/", async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(
      "SELECT * FROM seed_artworks ORDER BY id"
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Seed artworks list error:", err);
    res.status(500).json({ error: "Failed to fetch seed artworks" });
  }
});

router.post("/", async (req: Request, res: Response) => {
  try {
    const {
      artist_name,
      artwork_name,
      artwork_info,
      image_filename,
      visual_analysis,
    } = req.body;
    if (!artist_name || !artwork_name || !artwork_info || !image_filename) {
      return res.status(400).json({
        error:
          "artist_name, artwork_name, artwork_info, image_filename are required",
      });
    }
    const result = await pool.query(
      `INSERT INTO seed_artworks (artist_name, artwork_name, artwork_info, image_filename, visual_analysis)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        artist_name,
        artwork_name,
        artwork_info,
        image_filename,
        visual_analysis ?? null,
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Seed artwork create error:", err);
    res.status(500).json({ error: "Failed to create seed artwork" });
  }
});

router.put("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      artist_name,
      artwork_name,
      artwork_info,
      image_filename,
      visual_analysis,
    } = req.body;
    const result = await pool.query(
      `UPDATE seed_artworks
       SET artist_name = $1,
           artwork_name = $2,
           artwork_info = $3,
           image_filename = $4,
           visual_analysis = $5
       WHERE id = $6
       RETURNING *`,
      [
        artist_name,
        artwork_name,
        artwork_info,
        image_filename,
        visual_analysis ?? null,
        id,
      ]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Seed artwork not found" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Seed artwork update error:", err);
    res.status(500).json({ error: "Failed to update seed artwork" });
  }
});

router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      "DELETE FROM seed_artworks WHERE id = $1 RETURNING id",
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Seed artwork not found" });
    }
    res.json({ deleted: true });
  } catch (err) {
    console.error("Seed artwork delete error:", err);
    res.status(500).json({ error: "Failed to delete seed artwork" });
  }
});

export default router;
