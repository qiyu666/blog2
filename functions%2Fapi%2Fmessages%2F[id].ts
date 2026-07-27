// /api/messages/[id]
// GET    → fetch a single message (marks as read if recipient)
// DELETE → delete a message (sender or recipient)

import { json, error } from '../_helpers'
import { getSession } from '../_auth'

export async function onRequestGet(context: {
  request: Request
  params: { id: string }
  env: { DB: D1Database }
}) {
  const { request, params, env } = context
  const messageId = Number(params.id)
  if (!messageId) return error('Invalid message id')

  const { user } = await getSession(request, env.DB)
  if (!user) return error('请先登录', 401)

  const msg = await env.DB
    .prepare(
      `SELECT m.id, m.subject, m.content, m.read_at, m.created_at,
        fu.id AS from_id, fu.username AS from_username, fu.avatar AS from_avatar,
        tu.id AS to_id, tu.username AS to_username, tu.avatar AS to_avatar
       FROM messages m
       JOIN users fu ON m.from_user_id = fu.id
       JOIN users tu ON m.to_user_id = tu.id
       WHERE m.id = ?`
    )
    .bind(messageId)
    .first<{ from_user_id?: number; to_user_id?: number; read_at: string | null } & Record<string, unknown>>()

  if (!msg) return error('信件不存在', 404)

  // Authorization: only sender or recipient can read
  if (msg.from_id !== user.id && msg.to_id !== user.id) {
    return error('无权查看此信件', 403)
  }

  // Mark as read if recipient and not yet read
  if (msg.to_id === user.id && !msg.read_at) {
    await env.DB
      .prepare("UPDATE messages SET read_at = datetime('now') WHERE id = ?")
      .bind(messageId)
      .run()
    msg.read_at = new Date().toISOString()
  }

  return json(msg)
}

export async function onRequestDelete(context: {
  request: Request
  params: { id: string }
  env: { DB: D1Database }
}) {
  const { request, params, env } = context
  const messageId = Number(params.id)
  if (!messageId) return error('Invalid message id')

  const { user } = await getSession(request, env.DB)
  if (!user) return error('请先登录', 401)

  const msg = await env.DB
    .prepare('SELECT from_user_id, to_user_id FROM messages WHERE id = ?')
    .bind(messageId)
    .first<{ from_user_id: number; to_user_id: number }>()
  if (!msg) return error('信件不存在', 404)

  if (msg.from_user_id !== user.id && msg.to_user_id !== user.id) {
    return error('无权删除此信件', 403)
  }

  await env.DB.prepare('DELETE FROM messages WHERE id = ?').bind(messageId).run()
  return json({ success: true, id: messageId })
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
