// /api/messages
// GET  → list inbox (or ?box=sent for sent mail, ?box=unread for unread)
// POST → send a message (requires login)

import { json, error } from './_helpers'
import { getSession, cleanText } from './_auth'
import { notify } from './_notifications'

export async function onRequestGet(context: {
  request: Request
  env: { DB: D1Database }
}) {
  const { request, env } = context
  const { user } = await getSession(request, env.DB)
  if (!user) return error('请先登录', 401)

  const url = new URL(request.url)
  const box = url.searchParams.get('box') || 'inbox'

  try {
    let sql: string
    if (box === 'sent') {
      sql = `SELECT m.id, m.subject, m.content, m.read_at, m.created_at,
              u.id AS to_id, u.username AS to_username, u.avatar AS to_avatar
             FROM messages m JOIN users u ON m.to_user_id = u.id
             WHERE m.from_user_id = ?
             ORDER BY m.created_at DESC`
    } else if (box === 'unread') {
      sql = `SELECT m.id, m.subject, m.content, m.read_at, m.created_at,
              u.id AS from_id, u.username AS from_username, u.avatar AS from_avatar
             FROM messages m JOIN users u ON m.from_user_id = u.id
             WHERE m.to_user_id = ? AND m.read_at IS NULL
             ORDER BY m.created_at DESC`
    } else {
      sql = `SELECT m.id, m.subject, m.content, m.read_at, m.created_at,
              u.id AS from_id, u.username AS from_username, u.avatar AS from_avatar
             FROM messages m JOIN users u ON m.from_user_id = u.id
             WHERE m.to_user_id = ?
             ORDER BY m.created_at DESC`
    }
    const result = await env.DB.prepare(sql).bind(user.id).all()
    return json(result.results)
  } catch (err) {
    return error('Failed to fetch messages: ' + String(err), 500)
  }
}

export async function onRequestPost(context: {
  request: Request
  env: { DB: D1Database }
}) {
  const { request, env } = context
  const { user } = await getSession(request, env.DB)
  if (!user) return error('请先登录', 401)

  let body: { to?: string; subject?: string; content?: string }
  try {
    body = await request.json()
  } catch {
    return error('请求体格式错误')
  }

  const toIdentifier = (body.to || '').trim().toLowerCase()
  const subject = cleanText(body.subject, 200).trim() || '(无主题)'
  const content = cleanText(body.content, 5000).trim()

  if (!toIdentifier) return error('请指定收件人')
  if (!content) return error('信件内容不能为空')

  const recipient = await env.DB
    .prepare('SELECT id FROM users WHERE username = ? OR email = ?')
    .bind(toIdentifier, toIdentifier)
    .first<{ id: number }>()
  if (!recipient) return error('收件人不存在', 404)
  if (recipient.id === user.id) return error('不能给自己发信', 400)

  try {
    const result = await env.DB
      .prepare(
        'INSERT INTO messages (from_user_id, to_user_id, subject, content) VALUES (?, ?, ?, ?)'
      )
      .bind(user.id, recipient.id, subject, content)
      .run()
    const messageId = result.meta.last_row_id as number
    const message = await env.DB
      .prepare('SELECT id, subject, content, read_at, created_at FROM messages WHERE id = ?')
      .bind(messageId)
      .first()
    // 通知收件人
    void notify({
      db: env.DB,
      userId: recipient.id,
      actorId: user.id,
      type: 'message',
      messageId,
    })
    return json(message, 201)
  } catch (err) {
    return error('发送失败：' + String(err), 500)
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
