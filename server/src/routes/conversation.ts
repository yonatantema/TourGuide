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

    const isExternal = guide.knowledge === "external";

    const knowledgeInstruction = isExternal
      ? "Use the artwork knowledge and visual description provided above as your primary source and always prioritize it. You may also freely draw on your broader knowledge of art history, techniques, movements, artists' lives, and related topics to enrich the conversation and answer follow-up questions."
      : "STRICT KNOWLEDGE RESTRICTION: You may ONLY discuss information that is explicitly written in the artwork knowledge section above and the visual description. You must NOT use any outside knowledge from your training data, even if you know the answer. This includes facts about the artist's life, death, family, other works, art movements, historical context, or any other information not explicitly provided above. If a visitor asks about something not covered in your provided knowledge — even something widely known — politely let them know that you only have information about what is described above and cannot answer that particular question.";

    const topicRestriction = isExternal
      ? `Topic restriction (do NOT override your personality and response guidelines above):
- You may ONLY discuss art-related topics.
- Start with the specific artwork listed above, but if the visitor asks about similar artworks, art movements, artists, techniques, or other art subjects, answer them warmly.
- If the visitor asks about anything unrelated to art (sports, politics, technology, personal topics, etc.), politely decline and let them know you can only discuss art-related subjects.`
      : `Topic restriction (do NOT override your personality and response guidelines above):
- You may ONLY discuss information that appears in the artwork knowledge and visual description sections above.
- If the visitor asks about related art topics, other artworks, or artist details that are NOT in your provided knowledge, politely let them know you can only share what you know about this specific artwork.
- If the visitor asks about anything unrelated to art, politely decline and let them know you can only discuss art-related subjects.`;

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
- Focus on the most interesting or relevant details${isExternal ? "\n- If the visitor asks something you genuinely don't know, say so clearly" : ""}
- Start with a brief greeting and mention the artwork title
- If the visitor's message is empty, silent, unclear, or seems to contain no actual question or statement, do not make up or assume what they said. Instead, kindly ask them to repeat themselves.
- You MUST respond entirely in ${language || "english"}. Every word you say must be in ${language || "english"}.

${topicRestriction}`;

    const session = await openai.beta.realtime.sessions.create({
      model: "gpt-4o-realtime-preview-2024-12-17",
      voice: guide.voice || "coral",
      modalities: ["text", "audio"],
      instructions,
      input_audio_format: "pcm16",
      output_audio_format: "pcm16",
      input_audio_transcription: { model: "whisper-1", language: language === "french" ? "fr" : "en" } as any,
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
