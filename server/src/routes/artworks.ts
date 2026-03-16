import { Router, Request, Response } from "express";
import pool from "../db";
import upload from "../middleware/upload";
import { analyzeArtworkImage } from "../services/visualAnalysis";
import fs from "fs";
import path from "path";

const router = Router();

// GET /api/artworks — List all artworks
router.get("/", async (_req: Request, res: Response) => {
  try {
    const result = await pool.query("SELECT * FROM artworks ORDER BY created_at DESC");
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch artworks" });
  }
});

// GET /api/artworks/:id — Get single artwork
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query("SELECT * FROM artworks WHERE id = $1", [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Artwork not found" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch artwork" });
  }
});

// POST /api/artworks — Create artwork (multipart)
router.post("/", upload.single("image"), async (req: Request, res: Response) => {
  try {
    const { artist_name, artwork_name, artwork_info } = req.body;
    if (!req.file) {
      return res.status(400).json({ error: "Image is required" });
    }
    const image_filename = req.file.filename;
    const result = await pool.query(
      "INSERT INTO artworks (artist_name, artwork_name, artwork_info, image_filename) VALUES ($1, $2, $3, $4) RETURNING *",
      [artist_name, artwork_name, artwork_info, image_filename]
    );
    const artwork = result.rows[0];
    analyzeArtworkImage(artwork.image_filename, artwork.id).catch(() => {});
    res.status(201).json(artwork);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create artwork" });
  }
});

// PUT /api/artworks/:id — Update artwork (multipart)
router.put("/:id", upload.single("image"), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { artist_name, artwork_name, artwork_info } = req.body;

    // Check if artwork exists
    const existing = await pool.query("SELECT * FROM artworks WHERE id = $1", [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: "Artwork not found" });
    }

    let image_filename = existing.rows[0].image_filename;

    // If new image uploaded, delete old one and use new filename
    if (req.file) {
      const oldImagePath = path.join(__dirname, "../../uploads", image_filename);
      if (fs.existsSync(oldImagePath)) {
        fs.unlinkSync(oldImagePath);
      }
      image_filename = req.file.filename;
    }

    const result = req.file
      ? await pool.query(
          "UPDATE artworks SET artist_name = $1, artwork_name = $2, artwork_info = $3, image_filename = $4, visual_analysis = NULL WHERE id = $5 RETURNING *",
          [artist_name, artwork_name, artwork_info, image_filename, id]
        )
      : await pool.query(
          "UPDATE artworks SET artist_name = $1, artwork_name = $2, artwork_info = $3, image_filename = $4 WHERE id = $5 RETURNING *",
          [artist_name, artwork_name, artwork_info, image_filename, id]
        );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update artwork" });
  }
});

// DELETE /api/artworks/:id — Delete artwork + image
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query("SELECT * FROM artworks WHERE id = $1", [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Artwork not found" });
    }

    // Delete image file
    const imagePath = path.join(__dirname, "../../uploads", result.rows[0].image_filename);
    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
    }

    await pool.query("DELETE FROM artworks WHERE id = $1", [id]);
    res.json({ message: "Artwork deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete artwork" });
  }
});

export default router;
