// /api/series/[slug]
// GET    → 获取合集详情 + 文章列表（按 sort_order 排序）
// PUT    → 更新合集（管理员或作者）
// DELETE → 删除合集（管理员或作者）

import { json, error } from '../_helpers'
import { getSession } from '../_auth'

export async function onRequestGet(context: {
  request: Request
  params: { slug: string }
  env: { DB: D1Database }
}) {
  const { params, env } = context
  const { DB } = env

  const series = await DB
    .prepare(
      `SELECT s.id, s.slug, s.title, s.description, s.cover_image, s.author_id,
              u.username AS author_username,
              s.created_at
       FROM series s
       LEFT JOIN users u ON s.author_id = u.id
       WHERE s.slug = ?`
    )
    .bind(params.slug)
    .first()

  if (!series) return error('合集不存在', 404)

  const posts = await DB
    .prepare(
      `SELECT p.id, p.title, p.slug, p.excerpt, p.category, p.cover_image, p.views,
              p.created_at, ps.sort_order,
              (SELECT COUNT(*) FROM likes l WHERE l.post_id = p.id) AS likes_count,
              (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) AS comments_count
       FROM post_series ps
       JOIN posts p ON ps.post_id = p.id
       WHERE ps.series_id = ? AND p.published = 1
       ORDER BY ps.sort_order ASC, p.created_at ASC`
    )
    .bind(series.id)
    .all()

  return json({ series, posts: posts.results })
}

export async function onRequestPut(context: {
  request: Request
  params: { slug: string }
  env: { DB: D1Database }
}) {
  const { request, params, env } = context
  const { user } = await getSession(request, env.DB)
  if (!user) return error('请先登录', 401)

  const series = await env.DB
    .prepare('SELECT id, author_id FROM series WHERE slug = ?')
    .bind(params.slug)
    .first<{ id: number; author_id: number | null }>()
  if (!series) return error('合集不存在', 404)

  if (user.role !== 'admin' && series.author_id !== user.id) {
    return error('无权修改此合集', 403)
  }

  let body: { title?: string; description?: string; cover_image?: string }
  try {
    body = await request.json()
  } catch {
    return error('Invalid JSON body')
  }

  const updates: string[] = []
  const binds: (string | number | null)[] = []
  if (body.title !== undefined) {
    const title = body.title.trim().slice(0, 200)
    if (!title) return error('合集标题不能为空')
    updates.push('title = ?')
    binds.push(title)
  }
  if (body.description !== undefined) {
    updates.push('description = ?')
    binds.push(body.description.slice(0, 2000))
  }
  if (body.cover_image !== undefined) {
    updates.push('cover_image = ?')
    binds.push(body.cover_image.trim().slice(0, 500))
  }

  if (updates.length === 0) return error('没有要更新的字段')

  binds.push(series.id)
  await env.DB.prepare(`UPDATE series SET ${updates.join(', ')} WHERE id = ?`).bind(...binds).run()

  const updated = await env.DB
    .prepare('SELECT id, slug, title, description, cover_image, author_id, created_at FROM series WHERE id = ?')
    .bind(series.id)
    .first()
  return json(updated)
}

export async function onRequestDelete(context: {
  request: Request
  params: { slug: string }
  env: { DB: D1Database }
}) {
  const { request, params, env } = context
  const { user } = await getSession(request, env.DB)
  if (!user) return error('请先登录', 401)

  const series = await env.DB
    .prepare('SELECT id, author_id FROM series WHERE slug = ?')
    .bind(params.slug)
    .first<{ id: number; author_id: number | null }>()
  if (!series) return error('合集不存在', 404)

  if (user.role !== 'admin' && series.author_id !== user.id) {
    return error('无权删除此合集', 403)
  }

  await env.DB.prepare('DELETE FROM series WHERE id = ?').bind(series.id).run()
  return json({ ok: true })
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
