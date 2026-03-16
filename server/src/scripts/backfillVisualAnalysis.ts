import "dotenv/config";
import pool from "../db";
import { analyzeArtworkImage } from "../services/visualAnalysis";

async function backfill() {
  const { rows: artworks } = await pool.query(
    "SELECT id, artwork_name, image_filename FROM artworks WHERE visual_analysis IS NULL"
  );

  console.log(`Found ${artworks.length} artworks without visual analysis.`);

  for (const artwork of artworks) {
    console.log(`Analyzing: ${artwork.artwork_name} (id=${artwork.id})...`);
    const result = await analyzeArtworkImage(artwork.image_filename, artwork.id);
    if (result) {
      console.log(`  Done.`);
    } else {
      console.log(`  Failed — skipping.`);
    }
  }

  console.log("Backfill complete.");
  await pool.end();
}

backfill().catch((err) => {
  console.error("Backfill error:", err);
  process.exit(1);
});
