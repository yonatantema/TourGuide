import { Router } from "express";
import OpenAI from "openai";
import pool from "../db";

const router = Router();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

router.post("/session", async (req, res) => {
  try {
    const { guideId, artworkId, language } = req.body;

    if (!guideId || !artworkId) {
      return res.status(400).json({ error: "guideId and artworkId are required" });
    }

    const guideResult = await pool.query("SELECT * FROM guides WHERE id = $1", [guideId]);
    const guide = guideResult.rows[0];
    if (!guide) {
      return res.status(404).json({ error: "Guide not found" });
    }

    const artworkResult = await pool.query("SELECT * FROM artworks WHERE id = $1", [artworkId]);
    const artwork = artworkResult.rows[0];
    if (!artwork) {
      return res.status(404).json({ error: "Artwork not found" });
    }

    const instructions = `${guide.personality}

The artwork you are discussing:
Title: ${artwork.artwork_name}
Artist: ${artwork.artist_name}
Information: ${artwork.artwork_info}

Important instructions:
${guide.response_guidelines}
- Speak naturally and friendly
- Focus on the most interesting or relevant details
- If you don't know something, say it clearly
- Start with a brief greeting and mention the artwork title
- You MUST respond entirely in ${language || "english"}. Every word you say must be in ${language || "english"}.`;

    const session = await openai.beta.realtime.sessions.create({
      model: "gpt-4o-realtime-preview-2024-12-17",
      voice: guide.voice || "coral",
      modalities: ["text", "audio"],
      instructions,
      input_audio_format: "pcm16",
      output_audio_format: "pcm16",
      turn_detection: null as any, // push-to-talk: disable server VAD
    });

    return res.json({
      clientSecret: (session as any).client_secret?.value,
      expiresAt: (session as any).client_secret?.expires_at,
    });
  } catch (err) {
    console.error("Conversation session error:", err);
    res.status(500).json({ error: "Failed to create conversation session" });
  }
});

export default router;
