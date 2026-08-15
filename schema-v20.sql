-- schema-v20: 打赏功能字段
-- Run: npx wrangler d1 execute blog-db --remote --file=./schema-v20.sql

ALTER TABLE users ADD COLUMN tipping_wechat_qr TEXT DEFAULT '';
ALTER TABLE users ADD COLUMN tipping_alipay_qr TEXT DEFAULT '';
