import { Router, Request, Response } from "express";
import pool from "../db";
import upload from "../middleware/upload";
import { analyzeArtworkImage } from "../services/visualAnalysis";
import { checkLimit, incrementUsage } from "../services/usageLimits";
import fs from "fs";
import path from "path";

const router = Router();

// GET /api/artworks — List all artworks for the user's org
router.get("/", async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      "SELECT * FROM artworks WHERE org_id = $1 ORDER BY created_at DESC",
      [req.orgId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch artworks" });
  }
});

// GET /api/artworks/:id — Get single artwork (scoped to org)
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      "SELECT * FROM artworks WHERE id = $1 AND org_id = $2",
      [id, req.orgId]
    );
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
    const limitCheck = await checkLimit(req.user!.id, "artwork_creation");
    if (!limitCheck.allowed) {
      return res.status(429).json({
        error: "Monthly artwork creation limit reached",
        code: "USAGE_LIMIT_REACHED",
        action: "artwork_creation",
        current: limitCheck.current,
        limit: limitCheck.limit,
      });
    }

    const { artist_name, artwork_name, artwork_info } = req.body;
    if (!req.file) {
      return res.status(400).json({ error: "Image is required" });
    }
    const image_filename = req.file.filename;
    const result = await pool.query(
      "INSERT INTO artworks (artist_name, artwork_name, artwork_info, image_filename, org_id) VALUES ($1, $2, $3, $4, $5) RETURNING *",
      [artist_name, artwork_name, artwork_info, image_filename, req.orgId]
    );
    const artwork = result.rows[0];
    await incrementUsage(req.user!.id, "artwork_creation");
    analyzeArtworkImage(artwork.image_filename, artwork.id, req.orgId!).catch(() => {});
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

    // Check if artwork exists and belongs to this org
    const existing = await pool.query(
      "SELECT * FROM artworks WHERE id = $1 AND org_id = $2",
      [id, req.orgId]
    );
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: "Artwork not found" });
    }

    let image_filename = existing.rows[0].image_filename;

    // If new image uploaded, check usage limit, delete old one (skip seed images) and use new filename
    if (req.file) {
      const limitCheck = await checkLimit(req.user!.id, "artwork_creation");
      if (!limitCheck.allowed) {
        return res.status(429).json({
          error: "Monthly artwork creation limit reached",
          code: "USAGE_LIMIT_REACHED",
          action: "artwork_creation",
          current: limitCheck.current,
          limit: limitCheck.limit,
        });
      }
      if (!image_filename.startsWith("seed/")) {
        const oldImagePath = path.join(__dirname, "../../uploads", image_filename);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }
      image_filename = req.file.filename;
    }

    const result = req.file
      ? await pool.query(
          "UPDATE artworks SET artist_name = $1, artwork_name = $2, artwork_info = $3, image_filename = $4, visual_analysis = NULL WHERE id = $5 AND org_id = $6 RETURNING *",
          [artist_name, artwork_name, artwork_info, image_filename, id, req.orgId]
        )
      : await pool.query(
          "UPDATE artworks SET artist_name = $1, artwork_name = $2, artwork_info = $3, image_filename = $4 WHERE id = $5 AND org_id = $6 RETURNING *",
          [artist_name, artwork_name, artwork_info, image_filename, id, req.orgId]
        );

    if (req.file) {
      await incrementUsage(req.user!.id, "artwork_creation");
      analyzeArtworkImage(image_filename, Number(id), req.orgId!).catch(() => {});
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update artwork" });
  }
});

// DELETE /api/artworks/:id — Delete artwork + image (skip seed images)
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      "SELECT * FROM artworks WHERE id = $1 AND org_id = $2",
      [id, req.orgId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Artwork not found" });
    }

    const image_filename = result.rows[0].image_filename;
    // Don't delete shared seed images
    if (!image_filename.startsWith("seed/")) {
      const imagePath = path.join(__dirname, "../../uploads", image_filename);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    await pool.query("DELETE FROM artworks WHERE id = $1 AND org_id = $2", [
      id,
      req.orgId,
    ]);
    res.json({ message: "Artwork deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete artwork" });
  }
});

export default router;
