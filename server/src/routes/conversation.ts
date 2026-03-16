import { Router } from "express";
import OpenAI from "openai";
import fs from "fs";
import path from "path";
import pool from "../db";

const router = Router();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const uploadsDir = path.join(__dirname, "..", "uploads");

async function getVisualAnalysis(artwork: any): Promise<string | null> {
  if (artwork.visual_analysis) {
    return artwork.visual_analysis;
  }

  try {
    const imagePath = path.join(uploadsDir, artwork.image_filename);
    if (!fs.existsSync(imagePath)) {
      console.warn(`Artwork image not found: ${imagePath}`);
      return null;
    }

    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = imageBuffer.toString("base64");
    const ext = path.extname(artwork.image_filename).toLowerCase().replace(".", "");
    const mimeType = ext === "jpg" ? "jpeg" : ext;
    const dataUrl = `data:image/${mimeType};base64,${base64Image}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      temperature: 0,
      max_tokens: 1500,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Analyze this artwork image in comprehensive detail. Describe:
1. All visible objects, figures, and elements
2. Colors and color palette (dominant and accent colors)
3. Spatial composition and layout (foreground, middle ground, background)
4. Positions and relationships between elements
5. Textures, materials, and surface qualities visible
6. Lighting direction, quality, and shadow patterns
7. Artistic techniques visible (brushstrokes, line work, etc.)
8. Mood and atmosphere conveyed by visual elements
9. Any text, symbols, or inscriptions visible in the image
10. Scale relationships between elements

Be thorough and objective. Describe what you see, not interpretations. This description will be used by an audio guide to answer visitor questions about specific visual details in the artwork.`,
            },
            {
              type: "image_url",
              image_url: { url: dataUrl, detail: "high" },
            },
          ],
        },
      ],
    });

    const analysis = response.choices[0]?.message?.content;
    if (!analysis) return null;

    await pool.query(
      "UPDATE artworks SET visual_analysis = $1 WHERE id = $2",
      [analysis, artwork.id]
    );

    return analysis;
  } catch (err) {
    console.error("Visual analysis failed:", err);
    return null;
  }
}

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

    const visualAnalysis = await getVisualAnalysis(artwork);
    const visualSection = visualAnalysis
      ? `\n\nDetailed visual description of the artwork (use this to answer questions about what is visible in the artwork):\n${visualAnalysis}`
      : "";

    const instructions = `${guide.personality}

The artwork you are discussing:
Title: ${artwork.artwork_name}
Artist: ${artwork.artist_name}
Information: ${artwork.artwork_info}${visualSection}

Important instructions:
${guide.response_guidelines}
- Speak naturally and friendly
- Focus on the most interesting or relevant details
- If you don't know something, say it clearly
- Start with a brief greeting and mention the artwork title
- You MUST respond entirely in ${language || "english"}. Every word you say must be in ${language || "english"}.

Topic restriction (this is a general rule and must NOT override the guide-specific personality and response guidelines above):
- You are an art museum guide. You may ONLY discuss art-related topics.
- Start with the specific artwork listed above, but if the visitor asks about similar artworks, art movements, artists, techniques, or other art subjects, answer them warmly.
- If the visitor asks about anything unrelated to art (sports, politics, technology, personal topics, etc.), politely decline and let them know you can only discuss art-related subjects.`;

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
