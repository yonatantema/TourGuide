import OpenAI from "openai";
import fs from "fs";
import path from "path";
import pool from "../db";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const uploadsDir = path.join(__dirname, "..", "uploads");

export async function analyzeArtworkImage(
  imageFilename: string,
  artworkId: number
): Promise<string | null> {
  try {
    const imagePath = path.join(uploadsDir, imageFilename);
    if (!fs.existsSync(imagePath)) {
      console.warn(`Artwork image not found: ${imagePath}`);
      return null;
    }

    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = imageBuffer.toString("base64");
    const ext = path.extname(imageFilename).toLowerCase().replace(".", "");
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
      [analysis, artworkId]
    );

    return analysis;
  } catch (err) {
    console.error("Visual analysis failed:", err);
    return null;
  }
}
