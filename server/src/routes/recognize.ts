import { Router } from "express";
import OpenAI from "openai";
import pool from "../db";

const router = Router();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

router.post("/", async (req, res) => {
  try {
    const { image } = req.body;

    if (!image || typeof image !== "string") {
      return res.status(400).json({ error: "image is required" });
    }

    // Fetch all artworks from DB
    const artworksResult = await pool.query(
      "SELECT id, artwork_name, artist_name FROM artworks ORDER BY id"
    );
    const artworks = artworksResult.rows;

    if (artworks.length === 0) {
      return res.json({ recognized: false });
    }

    // Build numbered artwork list
    const artworkList = artworks
      .map(
        (a: any, i: number) =>
          `${i + 1}. ID=${a.id}: "${a.artwork_name}" by ${a.artist_name}`
      )
      .join("\n");

    const prompt = `You are an artwork identification system for a museum tour guide app.

You will be shown a photograph taken by a museum visitor's camera. Your task is to determine if the photograph shows one of the artworks in the museum's collection.

CRITICAL RULES:
- You must ONLY match if you are 100% certain the photograph shows one of the listed artworks.
- If there is ANY doubt whatsoever, respond with {"recognized": false}.
- Do NOT guess. Do NOT make assumptions. Do NOT hallucinate matches.
- The photograph may show anything — only match actual artworks you can clearly identify.

The museum's collection:
${artworkList}

Respond with ONLY valid JSON:
- If recognized: {"recognized": true, "artworkId": <id>}
- If not recognized: {"recognized": false}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      temperature: 0,
      max_tokens: 100,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            {
              type: "image_url",
              image_url: { url: image, detail: "low" },
            },
          ],
        },
      ],
    });

    const content = response.choices[0]?.message?.content?.trim();
    if (!content) {
      return res.json({ recognized: false });
    }

    let parsed: any;
    try {
      parsed = JSON.parse(content);
    } catch {
      return res.json({ recognized: false });
    }

    // Validate the response
    if (parsed.recognized === true && parsed.artworkId) {
      // Defense against hallucinated IDs — verify it exists in DB
      const validIds = artworks.map((a: any) => a.id);
      if (validIds.includes(parsed.artworkId)) {
        return res.json({ recognized: true, artworkId: parsed.artworkId });
      }
    }

    return res.json({ recognized: false });
  } catch (err) {
    console.error("Recognition error:", err);
    res.status(500).json({ error: "Recognition failed" });
  }
});

export default router;
