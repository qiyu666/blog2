// /api/posts/[id]/stats
// GET → return { pv, uv } for a specific post (author or admin only)

import { json, error } from '../../_helpers'
import { getSession } from '../../_auth'

async function resolvePostId(db: D1Database, idParam: string): Promise<{ id: number; author_id: number | null } | null> {
  const isNum = /^\d+$/.test(idParam)
  if (isNum) {
    const row = await db
      .prepare('SELECT id, author_id FROM posts WHERE id = ?')
      .bind(Number(idParam))
      .first<{ id: number; author_id: number | null }>()
    if (row) return row
  }
  const row = await db
    .prepare('SELECT id, author_id FROM posts WHERE slug = ?')
    .bind(idParam)
    .first<{ id: number; author_id: number | null }>()
  return row ?? null
}

async function ensurePostViewsTable(db: D1Database): Promise<void> {
  await db
    .prepare(
      `CREATE TABLE IF NOT EXISTS post_views (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        post_id INTEGER NOT NULL,
        visitor_hash TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`
    )
    .run()
  await db
    .prepare(
      `CREATE INDEX IF NOT EXISTS idx_post_views_post_created ON post_views(post_id, created_at)`
    )
    .run()
  await db
    .prepare(
      `CREATE INDEX IF NOT EXISTS idx_post_views_post_visitor ON post_views(post_id, visitor_hash, created_at)`
    )
    .run()
}

export async function onRequestGet(context: {
  request: Request
  params: { id: string }
  env: { DB: D1Database }
}) {
  const { request, params, env } = context

  const post = await resolvePostId(env.DB, params.id)
  if (!post) return error('Post not found', 404)

  const { user } = await getSession(request, env.DB)
  if (!user) return error('请先登录', 401)

  // 仅作者或管理员可查看 PV/UV
  const isAuthor = post.author_id !== null && post.author_id === user.id
  const isAdmin = user.role === 'admin'
  if (!isAuthor && !isAdmin) return error('无权访问', 403)

  await ensurePostViewsTable(env.DB)

  try {
    const row = await env.DB
      .prepare(
        `SELECT
          COUNT(*) AS pv,
          COUNT(DISTINCT visitor_hash) AS uv
         FROM post_views
         WHERE post_id = ?`
      )
      .bind(post.id)
      .first<{ pv: number; uv: number }>()

    return json({
      pv: row?.pv || 0,
      uv: row?.uv || 0,
    })
  } catch (err) {
    if (String(err).includes('no such table')) {
      return json({ pv: 0, uv: 0 })
    }
    return error('Failed to fetch stats: ' + String(err), 500)
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
