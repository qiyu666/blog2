-- schema-v9: 社交联系方式字段
-- Run: npx wrangler d1 execute blog-db --remote --file=./schema-v9.sql

ALTER TABLE users ADD COLUMN social_github TEXT DEFAULT '';
ALTER TABLE users ADD COLUMN social_twitter TEXT DEFAULT '';
ALTER TABLE users ADD COLUMN social_qq TEXT DEFAULT '';
ALTER TABLE users ADD COLUMN social_wechat TEXT DEFAULT '';
ALTER TABLE users ADD COLUMN social_telegram TEXT DEFAULT '';
ALTER TABLE users ADD COLUMN social_bilibili TEXT DEFAULT '';
ALTER TABLE users ADD COLUMN social_email TEXT DEFAULT '';
