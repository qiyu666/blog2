// /api/comments/[id]
// PATCH  → 编辑评论（5 分钟窗口内、本人或管理员）
// DELETE → 删除评论（作者或管理员）

import { json, error } from '../_helpers'
import { getSession, cleanText } from '../_auth'

export async function onRequestPatch(context: {
  request: Request
  params: { id: string }
  env: { DB: D1Database }
}) {
  const { request, params, env } = context
  const commentId = Number(params.id)
  if (!commentId) return error('Invalid comment id')

  const { user } = await getSession(request, env.DB)
  if (!user) return error('请先登录', 401)

  const comment = await env.DB
    .prepare('SELECT user_id, created_at FROM comments WHERE id = ?')
    .bind(commentId)
    .first<{ user_id: number; created_at: string }>()
  if (!comment) return error('评论不存在', 404)

  if (comment.user_id !== user.id && user.role !== 'admin') {
    return error('无权编辑此评论', 403)
  }

  // 普通用户仅 5 分钟内可编辑；管理员不受限
  if (user.role !== 'admin') {
    const ageMin = (Date.now() - new Date(comment.created_at + 'Z').getTime()) / 60000
    if (ageMin > 5) return error('评论编辑窗口已过（5 分钟）', 403)
  }

  let body: { content?: string }
  try {
    body = await request.json()
  } catch {
    return error('请求体格式错误')
  }

  const content = cleanText(body.content, 5000).trim()
  if (!content) return error('评论内容不能为空')

  await env.DB
    .prepare('UPDATE comments SET content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
    .bind(content, commentId)
    .run()

  const updated = await env.DB
    .prepare(
      `SELECT c.id, c.post_id, c.user_id, c.parent_id, c.content, c.created_at, c.updated_at,
        u.username AS author_username, u.avatar AS author_avatar
       FROM comments c JOIN users u ON c.user_id = u.id
       WHERE c.id = ?`
    )
    .bind(commentId)
    .first()

  return json(updated)
}

export async function onRequestDelete(context: {
  request: Request
  params: { id: string }
  env: { DB: D1Database }
}) {
  const { request, params, env } = context
  const commentId = Number(params.id)
  if (!commentId) return error('Invalid comment id')

  const { user } = await getSession(request, env.DB)
  if (!user) return error('请先登录', 401)

  const comment = await env.DB
    .prepare('SELECT user_id FROM comments WHERE id = ?')
    .bind(commentId)
    .first<{ user_id: number }>()
  if (!comment) return error('评论不存在', 404)

  if (comment.user_id !== user.id && user.role !== 'admin') {
    return error('无权删除此评论', 403)
  }

  await env.DB.prepare('DELETE FROM comments WHERE id = ?').bind(commentId).run()
  return json({ success: true, id: commentId })
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
