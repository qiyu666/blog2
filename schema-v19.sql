-- v19 添加好友请求系统
-- friend_requests: 好友请求记录
--   status: pending / accepted / rejected / cancelled
-- 双向关系处理：任意一方接受后，双方互为好友

CREATE TABLE IF NOT EXISTS friend_requests (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    from_user_id  INTEGER NOT NULL,
    to_user_id    INTEGER NOT NULL,
    status        TEXT NOT NULL DEFAULT 'pending',  -- pending / accepted / rejected / cancelled
    created_at    TEXT NOT NULL DEFAULT (datetime('now')),
    responded_at  TEXT,
    UNIQUE(from_user_id, to_user_id)
);

CREATE INDEX IF NOT EXISTS idx_friend_requests_to ON friend_requests(to_user_id, status);
CREATE INDEX IF NOT EXISTS idx_friend_requests_from ON friend_requests(from_user_id, status);
