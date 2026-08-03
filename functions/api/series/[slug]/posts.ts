// /api/series/[slug]/posts
// POST   → 添加文章到合集（需登录，admin 或合集作者）
//   body: { post_id: number, sort_order?: number }
// DELETE → 移除文章（?post_id=xxx）
// PATCH  → 批量调整顺序
//   body: { items: [{ post_id, sort_order }] }

import { json, error } from '../../_helpers'
import { getSession } from '../../_auth'

async function getSeriesForUser(db: D1Database, slug: string, userId: number, isAdmin: boolean) {
  const series = await db
    .prepare('SELECT id, author_id FROM series WHERE slug = ?')
    .bind(slug)
    .first<{ id: number; author_id: number | null }>()
  if (!series) return null
  if (!isAdmin && series.author_id !== userId) return null
  return series
}

export async function onRequestPost(context: {
  request: Request
  params: { slug: string }
  env: { DB: D1Database }
}) {
  const { request, params, env } = context
  const { user } = await getSession(request, env.DB)
  if (!user) return error('请先登录', 401)

  const series = await getSeriesForUser(env.DB, params.slug, user.id, user.role === 'admin')
  if (!series) return error('合集不存在或无权操作', 404)

  let body: { post_id?: number; sort_order?: number }
  try {
    body = await request.json()
  } catch {
    return error('Invalid JSON body')
  }
  if (!body.post_id) return error('post_id 必填')

  // 已存在则跳过
  const existing = await env.DB
    .prepare('SELECT 1 FROM post_series WHERE post_id = ? AND series_id = ?')
    .bind(body.post_id, series.id)
    .first()
  if (existing) return json({ ok: true, action: 'exists' })

  await env.DB
    .prepare('INSERT INTO post_series (post_id, series_id, sort_order) VALUES (?, ?, ?)')
    .bind(body.post_id, series.id, body.sort_order ?? 0)
    .run()
  return json({ ok: true, action: 'added' }, 201)
}

export async function onRequestDelete(context: {
  request: Request
  params: { slug: string }
  env: { DB: D1Database }
}) {
  const { request, params, env } = context
  const { user } = await getSession(request, env.DB)
  if (!user) return error('请先登录', 401)

  const series = await getSeriesForUser(env.DB, params.slug, user.id, user.role === 'admin')
  if (!series) return error('合集不存在或无权操作', 404)

  const url = new URL(request.url)
  const postId = Number(url.searchParams.get('post_id'))
  if (!postId) return error('post_id 必填')

  await env.DB
    .prepare('DELETE FROM post_series WHERE post_id = ? AND series_id = ?')
    .bind(postId, series.id)
    .run()
  return json({ ok: true })
}

export async function onRequestPatch(context: {
  request: Request
  params: { slug: string }
  env: { DB: D1Database }
}) {
  const { request, params, env } = context
  const { user } = await getSession(request, env.DB)
  if (!user) return error('请先登录', 401)

  const series = await getSeriesForUser(env.DB, params.slug, user.id, user.role === 'admin')
  if (!series) return error('合集不存在或无权操作', 404)

  let body: { items?: Array<{ post_id: number; sort_order: number }> }
  try {
    body = await request.json()
  } catch {
    return error('Invalid JSON body')
  }
  if (!body.items || !Array.isArray(body.items)) return error('items 必填')

  const stmts = body.items.map((item) =>
    env.DB
      .prepare('UPDATE post_series SET sort_order = ? WHERE post_id = ? AND series_id = ?')
      .bind(item.sort_order, item.post_id, series.id)
  )
  await env.DB.batch(stmts)
  return json({ ok: true })
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, DELETE, PATCH, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
