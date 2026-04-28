import { Router } from "express";
import OpenAI from "openai";
import pool from "../db";
import { checkLimit, incrementUsage, getLimit } from "../services/usageLimits";
import { getString, getNumber } from "../services/platformSettings";

const router = Router();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

router.post("/session", async (req, res) => {
  try {
    const limitCheck = await checkLimit(req.user!.id, req.user!.email, "conversation_seconds");
    if (!limitCheck.allowed) {
      return res.status(429).json({
        error: "Monthly conversation time limit reached",
        code: "USAGE_LIMIT_REACHED",
        action: "conversation_seconds",
        current: limitCheck.current,
        limit: limitCheck.limit,
      });
    }

    const { guideId, artworkId, language } = req.body;

    const [guideResult, artworkResult] = await Promise.all([
      pool.query("SELECT * FROM guides WHERE id = $1 AND org_id = $2", [guideId, req.orgId]),
      pool.query("SELECT * FROM artworks WHERE id = $1 AND org_id = $2", [artworkId, req.orgId]),
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
    const variant = isExternal ? "external" : "internal";

    // Editable cross-customer prompt fragments (see Platform Admin -> Prompts).
    // Hardcoded fallbacks here only kick in if platform_settings is empty.
    const [
      knowledgeInstruction,
      generalInstructions,
      topicRestriction,
      realtimeModel,
      transcriptionModel,
      defaultVoice,
      monthlyConversationSeconds,
    ] = await Promise.all([
      getString(`prompt.knowledge.${variant}`, ""),
      getString(`prompt.general.${variant}`, ""),
      getString(`prompt.topic.${variant}`, ""),
      getString("model.realtime", "gpt-realtime-1.5"),
      getString("model.transcription", "gpt-4o-transcribe"),
      getString("defaults.voice", "coral"),
      getLimit("conversation_seconds"),
    ]);

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
${generalInstructions}
- You MUST respond entirely in ${language || "english"}. Every word you say must be in ${language || "english"}.

${topicRestriction}`;

    const session = await openai.beta.realtime.sessions.create({
      model: realtimeModel as any,
      voice: guide.voice || defaultVoice,
      modalities: ["text", "audio"],
      instructions,
      input_audio_format: "pcm16",
      output_audio_format: "pcm16",
      input_audio_transcription: { model: transcriptionModel, language: language === "french" ? "fr" : "en" } as any,
      turn_detection: null as any, // push-to-talk: disable server VAD
    });

    const remainingSeconds = monthlyConversationSeconds - limitCheck.current;

    return res.json({
      clientSecret: (session as any).client_secret?.value,
      expiresAt: (session as any).client_secret?.expires_at,
      remainingSeconds,
    });
  } catch (err) {
    console.error("Conversation session error:", err);
    res.status(500).json({ error: "Failed to create conversation session" });
  }
});

router.post("/end", async (req, res) => {
  try {
    const { durationSeconds } = req.body;

    if (typeof durationSeconds !== "number" || durationSeconds < 0) {
      return res.status(400).json({ error: "Invalid duration" });
    }

    // Clamp to the configured per-session ceiling to prevent abuse.
    const sessionMax = await getNumber("limits.session_max_seconds", 900);
    const clamped = Math.min(Math.round(durationSeconds), sessionMax);

    if (clamped > 0) {
      await incrementUsage(req.user!.id, req.user!.email, "conversation_seconds", clamped);
    }

    res.json({ recorded: clamped });
  } catch (err) {
    console.error("Conversation end error:", err);
    res.status(500).json({ error: "Failed to record conversation duration" });
  }
});

export default router;
