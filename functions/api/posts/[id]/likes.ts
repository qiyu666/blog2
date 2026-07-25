// /api/posts/[id]/likes
// GET    → like count
// POST   → toggle like (requires login) — adds if absent, removes if present
// DELETE → remove like (requires login)

import { json, error } from '../../_helpers'
import { getSession } from '../../_auth'

async function resolvePostId(db: D1Database, idParam: string): Promise<number | null> {
  const isNum = /^\d+$/.test(idParam)
  const row = isNum
    ? await db.prepare('SELECT id FROM posts WHERE id = ?').bind(idParam).first<{ id: number }>()
    : await db.prepare('SELECT id FROM posts WHERE slug = ?').bind(idParam).first<{ id: number }>()
  return row?.id ?? null
}

export async function onRequestGet(context: {
  request: Request
  params: { id: string }
  env: { DB: D1Database }
}) {
  const { request, id } = { request: context.request, id: context.params.id }
  const { DB } = context.env
  const postId = await resolvePostId(DB, id)
  if (!postId) return error('Post not found', 404)

  const { user } = await getSession(request, DB)
  return countLikes(DB, postId, user?.id ?? null)
}

async function countLikes(db: D1Database, postId: number, userId: number | null) {
  const countRow = await db
    .prepare('SELECT COUNT(*) AS count FROM likes WHERE post_id = ?')
    .bind(postId)
    .first<{ count: number }>()
  let liked = false
  if (userId) {
    const likedRow = await db
      .prepare('SELECT id FROM likes WHERE post_id = ? AND user_id = ?')
      .bind(postId, userId)
      .first()
    liked = !!likedRow
  }
  return json({ count: countRow?.count ?? 0, liked })
}

export async function onRequestPost(context: {
  request: Request
  params: { id: string }
  env: { DB: D1Database }
}) {
  const { request, params, env } = context
  const { user } = await getSession(request, env.DB)
  if (!user) return error('请先登录', 401)

  const postId = await resolvePostId(env.DB, params.id)
  if (!postId) return error('Post not found', 404)

  const existing = await env.DB
    .prepare('SELECT id FROM likes WHERE post_id = ? AND user_id = ?')
    .bind(postId, user.id)
    .first()

  try {
    if (existing) {
      await env.DB.prepare('DELETE FROM likes WHERE post_id = ? AND user_id = ?')
        .bind(postId, user.id)
        .run()
      return json({ liked: false, action: 'unliked' })
    } else {
      await env.DB.prepare('INSERT INTO likes (post_id, user_id) VALUES (?, ?)')
        .bind(postId, user.id)
        .run()
      return json({ liked: true, action: 'liked' }, 201)
    }
  } catch (err) {
    return error('操作失败：' + String(err), 500)
  }
}

export async function onRequestDelete(context: {
  request: Request
  params: { id: string }
  env: { DB: D1Database }
}) {
  const { request, params, env } = context
  const { user } = await getSession(request, env.DB)
  if (!user) return error('请先登录', 401)

  const postId = await resolvePostId(env.DB, params.id)
  if (!postId) return error('Post not found', 404)

  await env.DB.prepare('DELETE FROM likes WHERE post_id = ? AND user_id = ?')
    .bind(postId, user.id)
    .run()
  return json({ liked: false })
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
