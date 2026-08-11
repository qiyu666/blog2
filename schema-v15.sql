-- schema-v15: annotations table
-- 允许读者对文章段落进行标注评论，支持嵌套回复

CREATE TABLE IF NOT EXISTS annotations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  element_hash TEXT NOT NULL,
  element_index INTEGER NOT NULL DEFAULT 0,
  element_type TEXT NOT NULL DEFAULT 'p',
  element_text TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL,
  parent_id INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_id) REFERENCES annotations(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_annotations_post ON annotations(post_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_annotations_element ON annotations(post_id, element_hash, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_annotations_parent ON annotations(parent_id);
