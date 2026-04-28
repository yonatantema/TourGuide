import { Router, Request, Response } from "express";
import pool from "../../db";

const router = Router();

router.get("/", async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(
      "SELECT * FROM seed_guides ORDER BY id"
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Seed guides list error:", err);
    res.status(500).json({ error: "Failed to fetch seed guides" });
  }
});

router.post("/", async (req: Request, res: Response) => {
  try {
    const {
      name,
      description,
      personality,
      response_guidelines,
      voice,
      knowledge,
      icon,
      hidden,
    } = req.body;
    if (!name || !personality || !response_guidelines) {
      return res.status(400).json({
        error: "name, personality, response_guidelines are required",
      });
    }
    const result = await pool.query(
      `INSERT INTO seed_guides
         (name, description, personality, response_guidelines, voice, knowledge, icon, hidden)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        name,
        description ?? "",
        personality,
        response_guidelines,
        voice ?? "coral",
        knowledge ?? "internal",
        icon ?? "art-expert",
        hidden ?? false,
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Seed guide create error:", err);
    res.status(500).json({ error: "Failed to create seed guide" });
  }
});

router.put("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      personality,
      response_guidelines,
      voice,
      knowledge,
      icon,
      hidden,
    } = req.body;
    const result = await pool.query(
      `UPDATE seed_guides
       SET name = $1,
           description = $2,
           personality = $3,
           response_guidelines = $4,
           voice = $5,
           knowledge = $6,
           icon = $7,
           hidden = $8
       WHERE id = $9
       RETURNING *`,
      [
        name,
        description ?? "",
        personality,
        response_guidelines,
        voice ?? "coral",
        knowledge ?? "internal",
        icon ?? "art-expert",
        hidden ?? false,
        id,
      ]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Seed guide not found" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Seed guide update error:", err);
    res.status(500).json({ error: "Failed to update seed guide" });
  }
});

router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      "DELETE FROM seed_guides WHERE id = $1 RETURNING id",
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Seed guide not found" });
    }
    res.json({ deleted: true });
  } catch (err) {
    console.error("Seed guide delete error:", err);
    res.status(500).json({ error: "Failed to delete seed guide" });
  }
});

export default router;
