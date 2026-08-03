// /api/links
// GET  → 列出所有友情链接（公开）
// POST → 新增友情链接（仅 admin）
// DELETE → 删除友情链接（仅 admin，?id=xxx）

import { json, error } from './_helpers'
import { getSession } from './_auth'

export async function onRequestGet(context: {
  env: { DB: D1Database }
}) {
  const { DB } = context.env
  try {
    const rows = await DB
      .prepare('SELECT id, name, url, description, sort_order FROM friend_links ORDER BY sort_order ASC, id ASC')
      .all()
    return json(rows.results)
  } catch (err) {
    if (String(err).includes('no such table')) return json([])
    return error('Failed to fetch links', 500)
  }
}

export async function onRequestPost(context: {
  request: Request
  env: { DB: D1Database }
}) {
  const { request, env } = context
  const { user } = await getSession(request, env.DB)
  if (!user || user.role !== 'admin') return error('无权操作', 403)

  let body: { name?: string; url?: string; description?: string; sort_order?: number }
  try {
    body = await request.json()
  } catch {
    return error('Invalid JSON body')
  }

  const name = (body.name || '').trim().slice(0, 100)
  const url = (body.url || '').trim().slice(0, 500)
  if (!name || !url) return error('名称和 URL 必填')

  const result = await env.DB
    .prepare('INSERT INTO friend_links (name, url, description, sort_order) VALUES (?, ?, ?, ?)')
    .bind(name, url, (body.description || '').slice(0, 500), body.sort_order ?? 0)
    .run()

  const link = await env.DB
    .prepare('SELECT id, name, url, description, sort_order FROM friend_links WHERE id = ?')
    .bind(result.meta.last_row_id)
    .first()
  return json(link, 201)
}

export async function onRequestDelete(context: {
  request: Request
  env: { DB: D1Database }
}) {
  const { request, env } = context
  const { user } = await getSession(request, env.DB)
  if (!user || user.role !== 'admin') return error('无权操作', 403)

  const url = new URL(request.url)
  const id = Number(url.searchParams.get('id'))
  if (!id) return error('id 必填')

  await env.DB.prepare('DELETE FROM friend_links WHERE id = ?').bind(id).run()
  return json({ ok: true })
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
