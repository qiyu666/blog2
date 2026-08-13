-- schema-v16.sql
-- 文章密码保护：posts 表添加 password 列
ALTER TABLE posts ADD COLUMN password TEXT DEFAULT '';
