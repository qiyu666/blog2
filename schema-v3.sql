-- Schema v3: user profiles with custom CSS
-- Run: npx wrangler d1 execute blog-db --remote --file=./schema-v3.sql

-- Add profile fields to users table
ALTER TABLE users ADD COLUMN display_name TEXT DEFAULT '';
ALTER TABLE users ADD COLUMN location TEXT DEFAULT '';
ALTER TABLE users ADD COLUMN website TEXT DEFAULT '';
ALTER TABLE users ADD COLUMN profile_css TEXT DEFAULT '';
ALTER TABLE users ADD COLUMN profile_bg TEXT DEFAULT '';
