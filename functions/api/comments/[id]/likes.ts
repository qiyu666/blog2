// /api/comments/[id]/likes
// GET    → like count (and whether current user liked)
// POST   → toggle like (requires login) — adds if absent, removes if present
// DELETE → remove like (requires login)

import { json, error } from '../../_helpers'
import { getSession } from '../../_auth'

async function resolveCommentId(db: D1Database, idParam: string): Promise<number | null> {
  if (!/^\d+$/.test(idParam)) return null
  const row = await db
    .prepare('SELECT id FROM comments WHERE id = ?')
    .bind(idParam)
    .first<{ id: number }>()
  return row?.id ?? null
}

export async function onRequestGet(context: {
  request: Request
  params: { id: string }
  env: { DB: D1Database }
}) {
  const { request, params, env } = context
  const { DB } = env
  const commentId = await resolveCommentId(DB, params.id)
  if (!commentId) return error('Comment not found', 404)

  const { user } = await getSession(request, DB)
  return countLikes(DB, commentId, user?.id ?? null)
}

async function countLikes(db: D1Database, commentId: number, userId: number | null) {
  const countRow = await db
    .prepare('SELECT COUNT(*) AS count FROM comment_likes WHERE comment_id = ?')
    .bind(commentId)
    .first<{ count: number }>()
  let liked = false
  if (userId) {
    const likedRow = await db
      .prepare('SELECT id FROM comment_likes WHERE comment_id = ? AND user_id = ?')
      .bind(commentId, userId)
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

  const commentId = await resolveCommentId(env.DB, params.id)
  if (!commentId) return error('Comment not found', 404)

  const existing = await env.DB
    .prepare('SELECT id FROM comment_likes WHERE comment_id = ? AND user_id = ?')
    .bind(commentId, user.id)
    .first()

  try {
    if (existing) {
      await env.DB
        .prepare('DELETE FROM comment_likes WHERE comment_id = ? AND user_id = ?')
        .bind(commentId, user.id)
        .run()
      return json({ liked: false, action: 'unliked' })
    } else {
      await env.DB
        .prepare('INSERT INTO comment_likes (comment_id, user_id) VALUES (?, ?)')
        .bind(commentId, user.id)
        .run()
      // 评论点赞不发送通知（保持简单）
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

  const commentId = await resolveCommentId(env.DB, params.id)
  if (!commentId) return error('Comment not found', 404)

  await env.DB
    .prepare('DELETE FROM comment_likes WHERE comment_id = ? AND user_id = ?')
    .bind(commentId, user.id)
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
