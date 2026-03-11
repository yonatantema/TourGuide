CREATE TABLE IF NOT EXISTS artworks (
  id SERIAL PRIMARY KEY,
  artist_name VARCHAR(255) NOT NULL,
  artwork_name VARCHAR(255) NOT NULL,
  artwork_info TEXT NOT NULL,
  image_filename VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
