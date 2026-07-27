// /api/comments/[id]
// DELETE → delete a comment (owner or admin only)

import { json, error } from '../_helpers'
import { getSession } from '../_auth'

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
      'Access-Control-Allow-Methods': 'DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
