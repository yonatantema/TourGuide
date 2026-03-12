CREATE TABLE IF NOT EXISTS artworks (
  id SERIAL PRIMARY KEY,
  artist_name VARCHAR(255) NOT NULL,
  artwork_name VARCHAR(255) NOT NULL,
  artwork_info TEXT NOT NULL,
  image_filename VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS guides (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  personality TEXT NOT NULL,
  response_guidelines TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE guides ADD COLUMN IF NOT EXISTS description TEXT NOT NULL DEFAULT '';
