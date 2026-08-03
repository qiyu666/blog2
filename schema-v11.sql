-- v11: 评论编辑支持 — 给 comments 表添加 updated_at 列
ALTER TABLE comments ADD COLUMN updated_at TEXT;
