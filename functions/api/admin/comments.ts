// /api/admin/comments
// GET → list all comments with post title and author (admin only)

import { json, error } from '../_helpers'
import { getSession } from '../_auth'
import { enforceAdminRateLimit } from '../_rate-limit'

export async function onRequestGet(context: {
  request: Request
  env: { DB: D1Database }
}) {
  const { request, env } = context
  const unauthLimit = await enforceAdminRateLimit(env.DB, request, false)
  if (unauthLimit) return unauthLimit

  const { user } = await getSession(request, env.DB)
  if (!user) return error('请先登录', 401)
  if (user.role !== 'admin') return error('无权访问', 403)

  const authLimit = await enforceAdminRateLimit(env.DB, request, true)
  if (authLimit) return authLimit

  try {
    const result = await env.DB
      .prepare(
        `SELECT c.id, c.content, c.created_at, c.post_id,
          u.username AS author_username,
          p.title AS post_title, p.slug AS post_slug
         FROM comments c
         JOIN users u ON c.user_id = u.id
         JOIN posts p ON c.post_id = p.id
         ORDER BY c.created_at DESC
         LIMIT 500`
      )
      .all()
    return json(result.results)
  } catch (err) {
    return error('Failed to fetch comments: ' + String(err), 500)
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
