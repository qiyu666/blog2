// GET /api/posts/[id]/neighbors
// 返回同分类下的上一篇/下一篇文章（仅 published）
// 用于文章详情页底部的导航

import { json } from '../../_helpers'

export async function onRequestGet(context: {
  request: Request
  params: { id: string }
  env: { DB: D1Database }
}) {
  const { params, env } = context
  const { DB } = env
  const slugOrId = params.id

  // 解析当前文章
  const isNumeric = /^\d+$/.test(slugOrId)
  const current = await DB
    .prepare(isNumeric ? 'SELECT id, category, created_at FROM posts WHERE id = ?' : 'SELECT id, category, created_at FROM posts WHERE slug = ?')
    .bind(slugOrId)
    .first<{ id: number; category: string; created_at: string }>()

  if (!current) return json({ previous: null, next: null })

  // 同分类下：上一篇（created_at < 当前，取最近一篇）、下一篇（created_at > 当前，取最早一篇）
  const [prevRow, nextRow] = await Promise.all([
    DB.prepare(
      `SELECT id, title, slug FROM posts
       WHERE published = 1 AND category = ? AND created_at < ?
       ORDER BY created_at DESC LIMIT 1`
    ).bind(current.category, current.created_at).first<{ id: number; title: string; slug: string }>(),
    DB.prepare(
      `SELECT id, title, slug FROM posts
       WHERE published = 1 AND category = ? AND created_at > ?
       ORDER BY created_at ASC LIMIT 1`
    ).bind(current.category, current.created_at).first<{ id: number; title: string; slug: string }>(),
  ])

  return json({
    previous: prevRow || null,
    next: nextRow || null,
  })
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
