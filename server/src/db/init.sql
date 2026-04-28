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
-- are TEXT and parsed by the consuming code. Pre-populated in a later
-- phase with the values that are currently hardcoded across the server.
CREATE TABLE IF NOT EXISTS platform_settings (
  key VARCHAR(100) PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES users(id)
);

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
