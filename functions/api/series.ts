// /api/series
// GET  → 列出所有合集（带文章数）
// POST → 创建合集（需登录，admin 或作者均可管理自己的合集）
// PUT  → 更新合集（管理员或作者）
// DELETE → 删除合集（管理员或作者）

import { json, error, slugify } from './_helpers'
import { getSession } from './_auth'

interface SeriesInput {
  title: string
  description?: string
  cover_image?: string
}

/** 为 series 表生成唯一 slug */
async function uniqueSeriesSlug(db: D1Database, slug: string): Promise<string> {
  let candidate = slug
  let n = 1
  while (true) {
    const existing = await db.prepare('SELECT id FROM series WHERE slug = ?').bind(candidate).first()
    if (!existing) return candidate
    candidate = `${slug}-${++n}`
  }
}

export async function onRequestGet(context: {
  request: Request
  env: { DB: D1Database }
}) {
  const { DB } = context.env
  try {
    const rows = await DB.prepare(
      `SELECT s.id, s.slug, s.title, s.description, s.cover_image, s.author_id,
              u.username AS author_username,
              (SELECT COUNT(*) FROM post_series ps WHERE ps.series_id = s.id) AS posts_count,
              s.created_at
       FROM series s
       LEFT JOIN users u ON s.author_id = u.id
       ORDER BY s.created_at DESC`
    ).all()
    return json(rows.results)
  } catch (err) {
    if (String(err).includes('no such table')) return json([])
    return error('Failed to fetch series', 500)
  }
}

export async function onRequestPost(context: {
  request: Request
  env: { DB: D1Database }
}) {
  const { request, env } = context
  const { user } = await getSession(request, env.DB)
  if (!user) return error('请先登录', 401)

  let body: SeriesInput
  try {
    body = await request.json()
  } catch {
    return error('Invalid JSON body')
  }

  const title = (body.title || '').trim().slice(0, 200)
  if (!title) return error('合集标题不能为空')

  const description = (body.description || '').slice(0, 2000)
  const cover_image = (body.cover_image || '').trim().slice(0, 500)
  const slug = await uniqueSeriesSlug(env.DB, slugify(title))

  try {
    const result = await env.DB.prepare(
      `INSERT INTO series (slug, title, description, cover_image, author_id)
       VALUES (?, ?, ?, ?, ?)`
    ).bind(slug, title, description, cover_image, user.id).run()

    const series = await env.DB
      .prepare('SELECT id, slug, title, description, cover_image, author_id, created_at FROM series WHERE id = ?')
      .bind(result.meta.last_row_id)
      .first()

    return json(series, 201)
  } catch (err) {
    return error('Failed to create series: ' + String(err), 500)
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
