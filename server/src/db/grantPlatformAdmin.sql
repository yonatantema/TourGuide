-- One-time bootstrap: promote initial TEMA Creative employees to platform_admin.
-- Run once per environment (staging, then prod) AFTER the platform_role column
-- has been deployed by init.sql. Future admins are promoted/demoted via the
-- Platform Admin UI by an existing platform_admin.
--
-- Usage:
--   psql "$DATABASE_URL" -f server/src/db/grantPlatformAdmin.sql
--
-- Edit the email list below before running. Listed emails that don't
-- correspond to an existing user are silently no-ops; the user can be
-- promoted later once they sign in for the first time.

UPDATE users
SET platform_role = 'platform_admin'
WHERE email IN (
  'yonatan@temacreative.com'
  -- add additional initial platform admins here, one per line, comma-separated:
  -- ,'someone-else@temacreative.com'
);

-- Sanity check — list all platform admins after promotion.
SELECT id, email, name, platform_role
FROM users
WHERE platform_role = 'platform_admin'
ORDER BY email;
