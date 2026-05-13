-- 004_add_website_url.sql
-- routes/profile-enhanced.ts updates users.website_url; ensure the column exists.

ALTER TABLE users ADD COLUMN IF NOT EXISTS website_url VARCHAR(500);
