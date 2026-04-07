import pool from "../db";

export async function seedOrgData(orgId: string): Promise<void> {
  await pool.query(
    `INSERT INTO artworks (artist_name, artwork_name, artwork_info, image_filename, visual_analysis, org_id)
     SELECT artist_name, artwork_name, artwork_info, image_filename, visual_analysis, $1
     FROM seed_artworks`,
    [orgId]
  );

  await pool.query(
    `INSERT INTO guides (name, description, personality, response_guidelines, voice, knowledge, icon, hidden, org_id)
     SELECT name, description, personality, response_guidelines, voice, knowledge, icon, hidden, $1
     FROM seed_guides`,
    [orgId]
  );
}
