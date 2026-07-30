-- schema-v8: Add bugs table + profile_layout column

-- Bug reports table
CREATE TABLE IF NOT EXISTS bugs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  reporter_id INTEGER,
  type TEXT NOT NULL DEFAULT 'bug',
  severity TEXT NOT NULL DEFAULT 'normal',
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  url TEXT DEFAULT '',
  browser TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'open',
  admin_note TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_bugs_status ON bugs(status);
CREATE INDEX IF NOT EXISTS idx_bugs_created_at ON bugs(created_at DESC);

-- Profile layout customization column
ALTER TABLE users ADD COLUMN profile_layout TEXT DEFAULT '';
