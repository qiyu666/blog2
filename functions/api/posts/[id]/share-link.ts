// /api/posts/[id]/share-link
// POST    → 生成草稿分享 token（仅作者/管理员），有效期 7 天
// GET     ?token=xxx → 公开访问，凭 token 读取草稿/已发布文章（无需登录）
// DELETE  ?token=xxx → 撤销某个分享 token（仅作者/管理员）

import { json, error } from '../../_helpers'
import { getSession, randomHex } from '../../_auth'

const SHARE_TOKEN_TTL_DAYS = 7

/** 自动建表：post_share_tokens */
async function ensureShareTokensTable(db: D1Database): Promise<void> {
  await db
    .prepare(
      `CREATE TABLE IF NOT EXISTS post_share_tokens (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        post_id INTEGER NOT NULL,
        token TEXT NOT NULL UNIQUE,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        expires_at TEXT NOT NULL,
        FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
      )`
    )
    .run()
  await db
    .prepare('CREATE INDEX IF NOT EXISTS idx_share_tokens_post ON post_share_tokens(post_id)')
    .run()
  await db
    .prepare('CREATE INDEX IF NOT EXISTS idx_share_tokens_token ON post_share_tokens(token)')
    .run()
}

function isNumeric(s: string): boolean {
  return /^\d+$/.test(s)
}

async function resolvePostId(db: D1Database, idParam: string): Promise<number | null> {
  if (isNumeric(idParam)) {
    const row = await db
      .prepare('SELECT id FROM posts WHERE id = ?')
      .bind(Number(idParam))
      .first<{ id: number }>()
    if (row) return row.id
  }
  const row = await db
    .prepare('SELECT id FROM posts WHERE slug = ?')
    .bind(idParam)
    .first<{ id: number }>()
  return row?.id ?? null
}

async function getPostWithStats(db: D1Database, postId: number) {
  return db
    .prepare(
      `SELECT p.*, u.username AS author_username, u.avatar AS author_avatar,
        (SELECT COUNT(*) FROM likes l WHERE l.post_id = p.id) AS likes_count,
        (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) AS comments_count
       FROM posts p LEFT JOIN users u ON p.author_id = u.id
       WHERE p.id = ?`
    )
    .bind(postId)
    .first()
}

export async function onRequestPost(context: {
  request: Request
  params: { id: string }
  env: { DB: D1Database }
}) {
  const { request, params, env } = context
  const { user } = await getSession(request, env.DB)
  if (!user) return error('请先登录', 401)

  const postId = await resolvePostId(env.DB, params.id)
  if (!postId) return error('文章不存在', 404)

  const post = await env.DB
    .prepare('SELECT author_id FROM posts WHERE id = ?')
    .bind(postId)
    .first<{ author_id: number | null }>()
  if (!post) return error('文章不存在', 404)

  if (post.author_id !== user.id && user.role !== 'admin') {
    return error('无权分享此文章', 403)
  }

  await ensureShareTokensTable(env.DB)

  const token = randomHex(16) // 32-char hex
  const expiresAt = new Date(Date.now() + SHARE_TOKEN_TTL_DAYS * 86400 * 1000)
    .toISOString()
    .replace('T', ' ')
    .replace(/\.\d+Z$/, '')

  const result = await env.DB
    .prepare(
      'INSERT INTO post_share_tokens (post_id, token, expires_at) VALUES (?, ?, ?)'
    )
    .bind(postId, token, expiresAt)
    .run()

  const shareUrl = `/share/${token}`
  return json({
    token,
    share_url: shareUrl,
    expires_at: expiresAt,
    id: result.meta?.last_row_id ?? null,
  }, 201)
}

export async function onRequestGet(context: {
  request: Request
  params: { id: string }
  env: { DB: D1Database }
}) {
  const { request, env } = context
  const url = new URL(request.url)
  const token = (url.searchParams.get('token') || '').trim()

  if (!token) return error('缺少 token 参数')

  await ensureShareTokensTable(env.DB)

  const row = await env.DB
    .prepare(
      `SELECT id, post_id, expires_at FROM post_share_tokens WHERE token = ?`
    )
    .bind(token)
    .first<{ id: number; post_id: number; expires_at: string }>()

  if (!row) return error('分享链接无效或已失效', 404)

  // 校验有效期
  const expiresMs = new Date(row.expires_at.replace(' ', 'T') + 'Z').getTime()
  if (Date.now() > expiresMs) {
    return error('分享链接已过期', 410)
  }

  const post = await getPostWithStats(env.DB, row.post_id)
  if (!post) return error('文章不存在', 404)

  // 通过分享链接可访问草稿，标记 is_share_preview
  return json({ post, is_share_preview: true, expires_at: row.expires_at })
}

export async function onRequestDelete(context: {
  request: Request
  params: { id: string }
  env: { DB: D1Database }
}) {
  const { request, params, env } = context
  const { user } = await getSession(request, env.DB)
  if (!user) return error('请先登录', 401)

  const postId = await resolvePostId(env.DB, params.id)
  if (!postId) return error('文章不存在', 404)

  const post = await env.DB
    .prepare('SELECT author_id FROM posts WHERE id = ?')
    .bind(postId)
    .first<{ author_id: number | null }>()
  if (!post) return error('文章不存在', 404)

  if (post.author_id !== user.id && user.role !== 'admin') {
    return error('无权操作', 403)
  }

  await ensureShareTokensTable(env.DB)

  const url = new URL(request.url)
  const token = (url.searchParams.get('token') || '').trim()

  if (token) {
    await env.DB
      .prepare('DELETE FROM post_share_tokens WHERE token = ? AND post_id = ?')
      .bind(token, postId)
      .run()
  } else {
    // 未指定 token：撤销该文章的所有分享链接
    await env.DB
      .prepare('DELETE FROM post_share_tokens WHERE post_id = ?')
      .bind(postId)
      .run()
  }

  return json({ success: true })
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
