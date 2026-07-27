-- Schema v5: search, notifications, follows, 2FA
-- Run: npx wrangler d1 execute blog-db --remote --file=./schema-v5.sql

-- ===== 全文搜索 (FTS5) =====
-- 用 external content 方式同步 posts 表，避免数据冗余
CREATE VIRTUAL TABLE IF NOT EXISTS posts_fts USING fts5(
  title,
  excerpt,
  content,
  tags,
  content='posts',
  content_rowid='id',
  tokenize='unicode61 remove_diacritics 2'
);

-- 触发器：posts 增删改时同步到 FTS
CREATE TRIGGER IF NOT EXISTS posts_ai AFTER INSERT ON posts BEGIN
  INSERT INTO posts_fts(rowid, title, excerpt, content, tags)
  VALUES (new.id, new.title, new.excerpt, new.content, new.tags);
END;
CREATE TRIGGER IF NOT EXISTS posts_ad AFTER DELETE ON posts BEGIN
  INSERT INTO posts_fts(posts_fts, rowid, title, excerpt, content, tags)
  VALUES ('delete', old.id, old.title, old.excerpt, old.content, old.tags);
END;
CREATE TRIGGER IF NOT EXISTS posts_au AFTER UPDATE ON posts BEGIN
  INSERT INTO posts_fts(posts_fts, rowid, title, excerpt, content, tags)
  VALUES ('delete', old.id, old.title, old.excerpt, old.content, old.tags);
  INSERT INTO posts_fts(rowid, title, excerpt, content, tags)
  VALUES (new.id, new.title, new.excerpt, new.content, new.tags);
END;

-- 把现有 posts 数据回填进 FTS
INSERT INTO posts_fts(rowid, title, excerpt, content, tags)
SELECT id, title, excerpt, content, tags FROM posts
WHERE id NOT IN (SELECT rowid FROM posts_fts);

-- ===== 通知系统 =====
CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,           -- 接收者
  actor_id INTEGER,                    -- 触发者（可为空表示系统）
  type TEXT NOT NULL,                  -- comment_reply / like / favorite / follow / message / system
  post_id INTEGER,                     -- 关联帖子（可空）
  comment_id INTEGER,                  -- 关联评论（可空）
  message_id INTEGER,                  -- 关联站内信（可空）
  read_at TEXT,                        -- NULL 表示未读
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  FOREIGN KEY (comment_id) REFERENCES comments(id) ON DELETE CASCADE,
  FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, read_at, created_at DESC);

-- ===== 关注 / 粉丝 =====
CREATE TABLE IF NOT EXISTS follows (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  follower_id INTEGER NOT NULL,        -- 关注者
  following_id INTEGER NOT NULL,       -- 被关注者
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(follower_id, following_id),
  FOREIGN KEY (follower_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (following_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_follows_follower ON follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following ON follows(following_id);

-- ===== 2FA =====
ALTER TABLE users ADD COLUMN totp_secret TEXT DEFAULT '';
ALTER TABLE users ADD COLUMN totp_enabled INTEGER NOT NULL DEFAULT 0;
