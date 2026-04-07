import { Router } from "express";
import OpenAI from "openai";
import pool from "../db";

const router = Router();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const identifyArtworkTool: OpenAI.ChatCompletionTool = {
  type: "function",
  function: {
    name: "identify_artwork",
    description: "Identify which artwork from the museum collection the visitor photographed",
    parameters: {
      type: "object",
      properties: {
        artwork_id: {
          type: "number",
          description: "The ID of the matched artwork from the collection",
        },
        confidence: {
          type: "string",
          enum: ["high", "medium", "low"],
          description: "How confident you are in the match",
        },
        reason: {
          type: "string",
          description: "Brief explanation of why this artwork was matched",
        },
      },
      required: ["artwork_id", "confidence", "reason"],
    },
  },
};

router.post("/", async (req, res) => {
  try {
    const { image } = req.body;

    if (!image || typeof image !== "string") {
      return res.status(400).json({ error: "image is required" });
    }

    // Fetch all artworks from DB (scoped to user's org)
    const artworksResult = await pool.query(
      "SELECT id, artwork_name, artist_name FROM artworks WHERE org_id = $1 ORDER BY id",
      [req.orgId]
    );
    const artworks = artworksResult.rows;

    if (artworks.length === 0) {
      return res.json({ recognized: false });
    }

    // Build collection as JSON array
    const collection = artworks.map((a: any) => ({
      id: a.id,
      name: a.artwork_name,
      artist: a.artist_name,
    }));

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      temperature: 0,
      max_tokens: 300,
      messages: [
        {
          role: "system",
          content:
            "You are an art recognition system in a museum. Your job is to identify if the visitor's photo matches one of the artworks in our collection. You must return the exact artwork ID from the provided collection.",
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `I'm visiting the museum and took a photo of an artwork. Identify which artwork from our collection this is.\n\nOur collection: ${JSON.stringify(collection)}`,
            },
            {
              type: "image_url",
              image_url: { url: image, detail: "auto" },
            },
          ],
        },
      ],
      tools: [identifyArtworkTool],
    });

    const message = response.choices[0]?.message;
    const toolCall = message?.tool_calls?.[0];

    if (!toolCall || toolCall.type !== "function" || toolCall.function.name !== "identify_artwork") {
      return res.json({ recognized: false });
    }

    let parsed: any;
    try {
      parsed = JSON.parse(toolCall.function.arguments);
    } catch {
      return res.json({ recognized: false });
    }

    // Reject low confidence matches
    if (parsed.confidence === "low") {
      return res.json({ recognized: false });
    }

    // Validate artwork ID exists in DB
    const validIds = artworks.map((a: any) => a.id);
    if (parsed.artwork_id && validIds.includes(parsed.artwork_id)) {
      return res.json({ recognized: true, artworkId: parsed.artwork_id });
    }

    return res.json({ recognized: false });
  } catch (err) {
    console.error("Recognition error:", err);
    res.status(500).json({ error: "Recognition failed" });
  }
});

export default router;
