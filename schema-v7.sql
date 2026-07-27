-- schema-v7: Add custom_js column to posts for per-article custom scripts
ALTER TABLE posts ADD COLUMN custom_js TEXT DEFAULT '';
