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

    const [guideResult, artworkResult] = await Promise.all([
      pool.query("SELECT * FROM guides WHERE id = $1", [guideId]),
      pool.query("SELECT * FROM artworks WHERE id = $1", [artworkId]),
    ]);

    const guide = guideResult.rows[0];
    if (!guide) {
      return res.status(404).json({ error: "Guide not found" });
    }

    const artwork = artworkResult.rows[0];
    if (!artwork) {
      return res.status(404).json({ error: "Artwork not found" });
    }

    const visualAnalysis = artwork.visual_analysis;
    const visualSection = visualAnalysis
      ? `\n\nDetailed visual description of the artwork (use this to answer questions about what is visible in the artwork):\n${visualAnalysis}`
      : "";

    const knowledgeInstruction = guide.knowledge === "external"
      ? "- Use the artwork knowledge provided above as your primary source. You may also draw on your broader knowledge of art history, techniques, movements, and artists to enrich the conversation, but always prioritize the provided information."
      : "- You must ONLY use the artwork knowledge provided above and the visual description to answer questions. Do not use any outside knowledge. If the visitor asks something not covered by your provided knowledge, say you don't have that information.";

    const instructions = `You are a museum guide. Your personality and how you must behave in every response:
${guide.personality}

Your specific response guidelines (you MUST follow these in every response):
${guide.response_guidelines}

The artwork you are discussing:
Title: ${artwork.artwork_name}
Artist: ${artwork.artist_name}

Your knowledge about this artwork (this is your primary source — present it naturally as your own expertise, do not claim you lack information when the answer is below):
${artwork.artwork_info}${visualSection}

General instructions:
${knowledgeInstruction}
- Speak naturally and friendly, always staying in character with your personality above
- Focus on the most interesting or relevant details
- If the visitor asks something not covered by your knowledge above and you genuinely don't know, say so clearly
- Start with a brief greeting and mention the artwork title
- You MUST respond entirely in ${language || "english"}. Every word you say must be in ${language || "english"}.

Topic restriction (do NOT override your personality and response guidelines above):
- You may ONLY discuss art-related topics.
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
