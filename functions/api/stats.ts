// /api/stats
// POST → record a visit { post_id } for PV/UV statistics
//
// post_views table:
//   id, post_id, visitor_hash, created_at
// UV: visitor_hash = SHA-256(IP + User-Agent) (privacy-preserving)
// Dedup: one unique visitor per post per day (UTC)

import { json, error } from './_helpers'

const encoder = new TextEncoder()

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
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

function getCfIp(request: Request): string {
  return (
    request.headers.get('CF-Connecting-IP') ||
    request.headers.get('X-Real-IP') ||
    (request.headers.get('X-Forwarded-For') || '').split(',')[0].trim() ||
    '0.0.0.0'
  )
}

async function hashVisitor(ip: string, userAgent: string): Promise<string> {
  const data = encoder.encode(ip + '|' + userAgent)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return bytesToHex(new Uint8Array(digest))
}

export async function onRequestPost(context: {
  request: Request
  env: { DB: D1Database }
}) {
  const { request, env } = context

  let body: { post_id?: number | string }
  try {
    body = await request.json()
  } catch {
    return error('请求体格式错误', 400)
  }

  if (!body.post_id) return error('缺少 post_id', 400)

  // 兼容数字 ID 和 slug
  const idParam = String(body.post_id)
  const isNum = /^\d+$/.test(idParam)
  let postId: number | null = null
  if (isNum) {
    const row = await env.DB
      .prepare('SELECT id FROM posts WHERE id = ?')
      .bind(Number(idParam))
      .first<{ id: number }>()
    if (row) postId = row.id
  }
  if (postId === null) {
    const row = await env.DB
      .prepare('SELECT id FROM posts WHERE slug = ?')
      .bind(idParam)
      .first<{ id: number }>()
    postId = row?.id ?? null
  }
  if (postId === null) return error('Post not found', 404)

  await ensurePostViewsTable(env.DB)

  const ip = getCfIp(request)
  const ua = request.headers.get('User-Agent') || ''
  const visitorHash = await hashVisitor(ip, ua)

  try {
    // 去重：同一访客（visitor_hash）当天对同一篇文章只计 1 次 UV
    // PV：仍然插入一条新记录（每次访问都算 1 PV），但只在当天未访问过时插入
    // —— 这里采用“每日每访客每文章去重 PV+UV”：当天已访问则不再插入。
    const today = new Date().toISOString().slice(0, 10)
    const already = await env.DB
      .prepare(
        `SELECT id FROM post_views
         WHERE post_id = ? AND visitor_hash = ?
           AND created_at >= ?`
      )
      .bind(postId, visitorHash, today + ' 00:00:00')
      .first()
    if (already) {
      return json({ success: true, deduplicated: true })
    }

    await env.DB
      .prepare(
        'INSERT INTO post_views (post_id, visitor_hash) VALUES (?, ?)'
      )
      .bind(postId, visitorHash)
      .run()

    return json({ success: true, deduplicated: false })
  } catch (err) {
    return error('记录访问失败：' + String(err), 500)
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
