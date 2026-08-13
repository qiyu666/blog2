-- schema-v15.sql
-- 社交链接：添加 Facebook

ALTER TABLE users ADD COLUMN social_facebook TEXT DEFAULT '';
