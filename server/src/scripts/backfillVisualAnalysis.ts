import pool from "../db";
import { analyzeArtworkImage } from "../services/visualAnalysis";

async function backfill() {
  const targetId = process.argv[2];

  const { rows: artworks } = targetId
    ? await pool.query(
        "SELECT id, artwork_name, image_filename, org_id FROM artworks WHERE id = $1",
        [targetId]
      )
    : await pool.query(
        "SELECT id, artwork_name, image_filename, org_id FROM artworks WHERE visual_analysis IS NULL"
      );

  console.log(`Found ${artworks.length} artwork(s) to analyze.`);

  for (const artwork of artworks) {
    console.log(`Analyzing: ${artwork.artwork_name} (id=${artwork.id})...`);
    const result = await analyzeArtworkImage(artwork.image_filename, artwork.id, artwork.org_id);
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
