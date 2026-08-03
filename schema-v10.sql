-- schema-v10: 成就徽章 + 用户作品集 + 可视化自定义
-- Run: npx wrangler d1 execute blog-db --remote --file=./schema-v10.sql

-- 用户作品集
CREATE TABLE IF NOT EXISTS user_portfolios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  description TEXT DEFAULT '',
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now', 'localtime')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 成就徽章
CREATE TABLE IF NOT EXISTS user_badges (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  badge TEXT NOT NULL,
  earned_at TEXT DEFAULT (datetime('now', 'localtime')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 可视化自定义（个人主页渐变、布局偏好）
CREATE TABLE IF NOT EXISTS user_customizations (
  user_id INTEGER PRIMARY KEY,
  gradient_colors TEXT DEFAULT '["#f97316","#ec4899"]',
  gradient_angle INTEGER DEFAULT 135,
  layout TEXT DEFAULT 'centered',
  card_style TEXT DEFAULT 'glass',
  show_portfolio INTEGER DEFAULT 1,
  show_badges INTEGER DEFAULT 1,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

PRAGMA user_version = 10;
