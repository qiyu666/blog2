// /api/posts/[id]/comments
// GET  → list comments for a post
// POST → create a comment (requires login)

import { json, error } from '../../_helpers'
import { getSession, cleanText } from '../../_auth'

async function resolvePostId(db: D1Database, idParam: string): Promise<number | null> {
  const isNum = /^\d+$/.test(idParam)
  const row = isNum
    ? await db.prepare('SELECT id FROM posts WHERE id = ?').bind(idParam).first<{ id: number }>()
    : await db.prepare('SELECT id FROM posts WHERE slug = ?').bind(idParam).first<{ id: number }>()
  return row?.id ?? null
}

export async function onRequestGet(context: {
  params: { id: string }
  env: { DB: D1Database }
}) {
  const { id } = context.params
  const { DB } = context.env

  const postId = await resolvePostId(DB, id)
  if (!postId) return error('Post not found', 404)

  try {
    const result = await DB.prepare(
      `SELECT c.id, c.post_id, c.user_id, c.parent_id, c.content, c.created_at,
        u.username AS author_username, u.avatar AS author_avatar
       FROM comments c
       JOIN users u ON c.user_id = u.id
       WHERE c.post_id = ?
       ORDER BY c.created_at ASC`
    )
      .bind(postId)
      .all()
    return json(result.results)
  } catch (err) {
    if (String(err).includes('no such table')) return json([])
    return error('Failed to fetch comments', 500)
  }
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

  let body: { content?: string; parent_id?: number | null }
  try {
    body = await request.json()
  } catch {
    return error('请求体格式错误')
  }

  const content = cleanText(body.content, 5000).trim()
  if (!content) return error('评论内容不能为空')

  const parentId = body.parent_id || null
  if (parentId !== null) {
    const parent = await env.DB
      .prepare('SELECT id FROM comments WHERE id = ? AND post_id = ?')
      .bind(parentId, postId)
      .first()
    if (!parent) return error('父评论不存在', 400)
  }

  try {
    const result = await env.DB
      .prepare(
        'INSERT INTO comments (post_id, user_id, parent_id, content) VALUES (?, ?, ?, ?)'
      )
      .bind(postId, user.id, parentId, content)
      .run()
    const comment = await env.DB
      .prepare(
        `SELECT c.id, c.post_id, c.user_id, c.parent_id, c.content, c.created_at,
          u.username AS author_username, u.avatar AS author_avatar
         FROM comments c JOIN users u ON c.user_id = u.id
         WHERE c.id = ?`
      )
      .bind(result.meta.last_row_id)
      .first()
    return json(comment, 201)
  } catch (err) {
    return error('评论失败：' + String(err), 500)
  }
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
