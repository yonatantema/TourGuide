-- Organizations (tenants)
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  is_personal BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Users
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  google_id VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  picture VARCHAR(512),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Organization memberships
CREATE TABLE IF NOT EXISTS org_members (
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL DEFAULT 'owner',
  created_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (org_id, user_id)
);

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
ALTER TABLE guides ADD COLUMN IF NOT EXISTS voice VARCHAR(50) NOT NULL DEFAULT 'coral';
ALTER TABLE artworks ADD COLUMN IF NOT EXISTS visual_analysis TEXT;
ALTER TABLE guides ADD COLUMN IF NOT EXISTS knowledge VARCHAR(10) NOT NULL DEFAULT 'internal';
ALTER TABLE guides ADD COLUMN IF NOT EXISTS icon VARCHAR(255) NOT NULL DEFAULT 'art-expert';
ALTER TABLE guides ADD COLUMN IF NOT EXISTS hidden BOOLEAN NOT NULL DEFAULT false;

-- Platform-level role on users. 'user' (default) or 'platform_admin'.
-- Platform admins (TEMA Creative employees) can edit cross-customer
-- settings via the /platform UI.
ALTER TABLE users ADD COLUMN IF NOT EXISTS platform_role VARCHAR(20) NOT NULL DEFAULT 'user';

-- Cross-customer key/value settings edited by platform admins. Values
-- are TEXT and parsed by the consuming code (string / number / multi-line
-- prompt). Defaults below mirror the values that used to be hardcoded
-- across the server. ON CONFLICT DO NOTHING means re-running init.sql is
-- safe and never overwrites edits made by platform admins.
CREATE TABLE IF NOT EXISTS platform_settings (
  key VARCHAR(100) PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES users(id)
);

-- ---------- Conversation prompts (consumed by routes/conversation.ts) ----------
-- knowledge.* = how the guide treats the artwork knowledge it has been given
-- topic.*     = which topics the guide is allowed to discuss
-- general.*   = response style: greeting, IPA pronunciation, empty-input handling, etc.
-- The .external / .internal split follows the guide's `knowledge` field.

INSERT INTO platform_settings (key, value) VALUES
  ('prompt.knowledge.external',
   $$Use the artwork knowledge and visual description provided above as your primary source and always prioritize it. You may also freely draw on your broader knowledge of art history, techniques, movements, artists' lives, and related topics to enrich the conversation and answer follow-up questions.$$),

  ('prompt.knowledge.internal',
   $$STRICT KNOWLEDGE RESTRICTION: You may ONLY discuss information that is explicitly written in the artwork knowledge section above and the visual description. You must NOT use any outside knowledge from your training data, even if you know the answer. This includes facts about the artist's life, death, family, other works, art movements, historical context, or any other information not explicitly provided above. If a visitor asks about something not covered in your provided knowledge — even something widely known — politely let them know that you only have information about what is described above and cannot answer that particular question.$$),

  ('prompt.topic.external',
   $$Topic restriction (do NOT override your personality and response guidelines above):
- You may ONLY discuss art-related topics.
- Start with the specific artwork listed above, but if the visitor asks about similar artworks, art movements, artists, techniques, or other art subjects, answer them warmly.
- If the visitor asks about anything unrelated to art (sports, politics, technology, personal topics, etc.), politely decline and let them know you can only discuss art-related subjects.$$),

  ('prompt.topic.internal',
   $$Topic restriction (do NOT override your personality and response guidelines above):
- You may ONLY discuss information that appears in the artwork knowledge and visual description sections above.
- If the visitor asks about related art topics, other artworks, or artist details that are NOT in your provided knowledge, politely let them know you can only share what you know about this specific artwork.
- If the visitor asks about anything unrelated to art, politely decline and let them know you can only discuss art-related subjects.$$),

  ('prompt.general.external',
   $$- Speak naturally and friendly, always staying in character with your personality above
- Focus on the most interesting or relevant details
- If the visitor asks something you genuinely don't know, say so clearly
- Start with a brief, general greeting and mention the artwork title. Keep the opening short and high-level — do not go into specific details about what figures are wearing, holding, or doing. Wait for the visitor to ask before diving into specifics.
- If the visitor's message is empty, silent, unclear, or seems to contain no actual question or statement, do not make up or assume what they said. Instead, kindly ask them to repeat themselves.
- When pronouncing the name of an artist, use the original language's pronunciation of that artist name, based on IPA (International Phonetic Alphabet).$$),

  ('prompt.general.internal',
   $$- Speak naturally and friendly, always staying in character with your personality above
- Focus on the most interesting or relevant details
- Start with a brief, general greeting and mention the artwork title. Keep the opening short and high-level — do not go into specific details about what figures are wearing, holding, or doing. Wait for the visitor to ask before diving into specifics.
- If the visitor's message is empty, silent, unclear, or seems to contain no actual question or statement, do not make up or assume what they said. Instead, kindly ask them to repeat themselves.
- When pronouncing the name of an artist, use the original language's pronunciation of that artist name, based on IPA (International Phonetic Alphabet).$$)
ON CONFLICT (key) DO NOTHING;

-- ---------- Models & hyperparameters ----------
INSERT INTO platform_settings (key, value) VALUES
  ('model.realtime', 'gpt-realtime-1.5'),
  ('model.transcription', 'gpt-4o-transcribe'),

  ('model.recognition', 'gpt-4o'),
  ('model.recognition.temperature', '0'),
  ('model.recognition.max_tokens', '300'),
  ('prompt.recognition.system',
   $$You are an art recognition system in a museum. Your job is to identify if the visitor's photo matches one of the artworks in our collection. You must return the exact artwork ID from the provided collection.$$),

  ('model.visual_analysis', 'gpt-4o'),
  ('model.visual_analysis.temperature', '0'),
  ('model.visual_analysis.max_tokens', '1500'),
  ('prompt.visual_analysis',
   $$Analyze this artwork image in comprehensive detail. Describe:
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

Be thorough and objective. Describe what you see, not interpretations. This description will be used by an audio guide to answer visitor questions about specific visual details in the artwork.$$)
ON CONFLICT (key) DO NOTHING;

-- ---------- Usage limits ----------
INSERT INTO platform_settings (key, value) VALUES
  ('limits.artwork_creation_per_month', '10'),
  ('limits.image_recognition_per_month', '30'),
  ('limits.conversation_seconds_per_month', '600'),
  ('limits.session_max_seconds', '900')
ON CONFLICT (key) DO NOTHING;

-- ---------- Defaults applied to new guides when not specified ----------
INSERT INTO platform_settings (key, value) VALUES
  ('defaults.voice', 'coral'),
  ('defaults.knowledge', 'internal'),
  ('defaults.icon', 'art-expert')
ON CONFLICT (key) DO NOTHING;

-- Multi-tenancy: add org_id to data tables
ALTER TABLE artworks ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE guides ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_artworks_org_id ON artworks(org_id);
CREATE INDEX IF NOT EXISTS idx_guides_org_id ON guides(org_id);

-- Seed data templates
CREATE TABLE IF NOT EXISTS seed_artworks (
  id SERIAL PRIMARY KEY,
  artist_name VARCHAR(255) NOT NULL,
  artwork_name VARCHAR(255) NOT NULL,
  artwork_info TEXT NOT NULL,
  image_filename VARCHAR(255) NOT NULL,
  visual_analysis TEXT
);

-- Usage tracking for monthly limits
CREATE TABLE IF NOT EXISTS usage_counters (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  year SMALLINT NOT NULL,
  month SMALLINT NOT NULL,
  action_type VARCHAR(30) NOT NULL,
  count INT NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, year, month, action_type)
);

CREATE TABLE IF NOT EXISTS seed_guides (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  personality TEXT NOT NULL,
  response_guidelines TEXT NOT NULL,
  voice VARCHAR(50) NOT NULL DEFAULT 'coral',
  knowledge VARCHAR(10) NOT NULL DEFAULT 'internal',
  icon VARCHAR(255) NOT NULL DEFAULT 'art-expert',
  hidden BOOLEAN NOT NULL DEFAULT false
);
