-- schema-v17.sql
-- 社交链接：添加 WhatsApp
ALTER TABLE users ADD COLUMN social_whatsapp TEXT DEFAULT '';
