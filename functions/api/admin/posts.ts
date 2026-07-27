// /api/admin/posts
// GET → list all posts with author + stats (admin only, includes unpublished)

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
        `SELECT p.id, p.title, p.slug, p.category, p.published, p.views,
          p.created_at, p.updated_at, p.is_pinned, p.is_featured,
          u.username AS author_username,
          (SELECT COUNT(*) FROM likes l WHERE l.post_id = p.id) AS likes_count,
          (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) AS comments_count
         FROM posts p
         LEFT JOIN users u ON p.author_id = u.id
         ORDER BY p.is_pinned DESC, p.created_at DESC`
      )
      .all()
    return json(result.results.map((p: any) => ({
      ...p,
      status: p.published ? 'published' : 'draft',
      is_pinned: p.is_pinned || 0,
      is_featured: p.is_featured || 0,
    })))
  } catch (err) {
    return error('Failed to fetch posts: ' + String(err), 500)
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
