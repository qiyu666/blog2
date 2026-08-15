// /api/messages
// GET  → list inbox (or ?box=sent for sent mail, ?box=unread for unread)
//       → list with ?from_id=N to filter messages from a specific user (chat mode)
// POST → send a message (requires login)
// POST /api/messages/read-all → mark all messages from a user as read

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
  const fromId = url.searchParams.get('from_id')

  try {
    let sql: string
    let bindVars: unknown[] = [user.id]

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
    } else if (fromId) {
      // 聊天模式：获取与某用户的对话
      const fid = Number(fromId)
      sql = `SELECT m.id, m.subject, m.content, m.read_at, m.created_at,
              u.id AS from_id, u.username AS from_username, u.avatar AS from_avatar,
              CASE WHEN m.from_user_id = ? THEN m.to_user_id ELSE m.from_user_id END AS other_id,
              CASE WHEN m.from_user_id = ? THEN u2.username ELSE u.username END AS other_username,
              CASE WHEN m.from_user_id = ? THEN u2.avatar ELSE u.avatar END AS other_avatar
             FROM messages m
             JOIN users u ON m.from_user_id = u.id
             LEFT JOIN users u2 ON m.to_user_id = u2.id
             WHERE (m.from_user_id = ? AND m.to_user_id = ?)
                OR (m.from_user_id = ? AND m.to_user_id = ?)
             ORDER BY m.created_at ASC`
      bindVars = [user.id, user.id, user.id, user.id, fid, fid, user.id]
    } else {
      sql = `SELECT m.id, m.subject, m.content, m.read_at, m.created_at,
              u.id AS from_id, u.username AS from_username, u.avatar AS from_avatar
             FROM messages m JOIN users u ON m.from_user_id = u.id
             WHERE m.to_user_id = ?
             ORDER BY m.created_at DESC`
    }
    const result = await env.DB.prepare(sql).bind(...bindVars).all()
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

  const url = new URL(request.url)

  // POST /api/messages/read-all
  if (url.pathname.endsWith('/read-all')) {
    const body = await request.json().catch(() => ({}))
    const fromId = Number(body.from_id)
    if (!fromId) return error('缺少 from_id', 400)
    try {
      await env.DB.prepare(
        `UPDATE messages SET read_at = datetime('now')
         WHERE to_user_id = ? AND from_user_id = ? AND read_at IS NULL`
      ).bind(user.id, fromId).run()
      return json({ ok: true })
    } catch (err) {
      return error('操作失败: ' + String(err), 500)
    }
  }

  // POST /api/messages — 发送消息
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
