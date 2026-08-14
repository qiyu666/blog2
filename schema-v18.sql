ALTER TABLE posts ADD COLUMN scheduled_at TEXT DEFAULT NULL;
CREATE TABLE IF NOT EXISTS reading_checkins (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL,
  post_id     INTEGER NOT NULL,
  check_in_date TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  UNIQUE(user_id, post_id, check_in_date)
);
CREATE INDEX IF NOT EXISTS idx_reading_checkins_user_date ON reading_checkins(user_id, check_in_date);
CREATE INDEX IF NOT EXISTS idx_reading_checkins_post ON reading_checkins(post_id);
