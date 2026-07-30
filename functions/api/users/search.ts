// /api/users/search?q=username
// 按用户名前缀搜索用户（用于 @ 补全）

import { json, error } from '../_helpers'
import { getSession } from '../_auth'

export async function onRequestGet(context: {
  request: Request
  env: { DB: D1Database }
}) {
  const { request, env } = context
  const { user } = await getSession(request, env.DB)
  if (!user) return error('请先登录', 401)

  const url = new URL(request.url)
  const q = (url.searchParams.get('q') || '').trim()
  if (!q || q.length < 1) return json([])

  try {
    const result = await env.DB
      .prepare(
        `SELECT id, username, display_name, avatar
         FROM users
         WHERE username LIKE ?1 ESCAPE '\\'
         ORDER BY username ASC
         LIMIT 10`
      )
      .bind(q + '%')
      .all()
    return json(result.results)
  } catch {
    return json([])
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
