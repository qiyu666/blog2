// /api/favorites
// GET → list current user's favorited posts

import { json, error } from './_helpers'
import { getSession } from './_auth'

export async function onRequestGet(context: {
  request: Request
  env: { DB: D1Database }
}) {
  const { request, env } = context
  const { user } = await getSession(request, env.DB)
  if (!user) return error('请先登录', 401)

  try {
    const result = await env.DB.prepare(
      `SELECT p.id, p.title, p.slug, p.excerpt, p.author, p.category, p.cover_image,
        p.created_at, p.views, u.username AS author_username,
        f.created_at AS favorited_at,
        (SELECT COUNT(*) FROM likes l WHERE l.post_id = p.id) AS likes_count,
        (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) AS comments_count
       FROM favorites f
       JOIN posts p ON f.post_id = p.id
       LEFT JOIN users u ON p.author_id = u.id
       WHERE f.user_id = ?
       ORDER BY f.created_at DESC`
    )
      .bind(user.id)
      .all()
    return json(result.results)
  } catch (err) {
    return error('Failed to fetch favorites: ' + String(err), 500)
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
