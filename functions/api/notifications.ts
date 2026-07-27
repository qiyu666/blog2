// /api/notifications
// GET    → list notifications for current user (?box=unread for unread only)
// POST   → mark one (or all) as read  { id?: number, all?: true }
// DELETE → delete one (or all)

import { json, error } from './_helpers'
import { getSession } from './_auth'

export async function onRequestGet(context: {
  request: Request
  env: { DB: D1Database }
}) {
  const { request, env } = context
  const { user } = await getSession(request, env.DB)
  if (!user) return error('请先登录', 401)

  const url = new URL(request.url)
  const onlyUnread = url.searchParams.get('box') === 'unread'

  try {
    const sql = onlyUnread
      ? `SELECT n.id, n.type, n.read_at, n.created_at,
          n.post_id, n.comment_id, n.message_id,
          actor.username AS actor_username, actor.avatar AS actor_avatar,
          p.title AS post_title, p.slug AS post_slug
         FROM notifications n
         LEFT JOIN users actor ON n.actor_id = actor.id
         LEFT JOIN posts p ON n.post_id = p.id
         WHERE n.user_id = ? AND n.read_at IS NULL
         ORDER BY n.created_at DESC
         LIMIT 50`
      : `SELECT n.id, n.type, n.read_at, n.created_at,
          n.post_id, n.comment_id, n.message_id,
          actor.username AS actor_username, actor.avatar AS actor_avatar,
          p.title AS post_title, p.slug AS post_slug
         FROM notifications n
         LEFT JOIN users actor ON n.actor_id = actor.id
         LEFT JOIN posts p ON n.post_id = p.id
         WHERE n.user_id = ?
         ORDER BY n.created_at DESC
         LIMIT 50`
    const result = await env.DB.prepare(sql).bind(user.id).all()
    return json(result.results)
  } catch (err) {
    return error('获取通知失败：' + String(err), 500)
  }
}

export async function onRequestPost(context: {
  request: Request
  env: { DB: D1Database }
}) {
  const { request, env } = context
  const { user } = await getSession(request, env.DB)
  if (!user) return error('请先登录', 401)

  let body: { id?: number; all?: boolean }
  try {
    body = await request.json()
  } catch {
    return error('请求体格式错误')
  }

  try {
    if (body.all) {
      await env.DB
        .prepare(
          `UPDATE notifications SET read_at = datetime('now')
           WHERE user_id = ? AND read_at IS NULL`
        )
        .bind(user.id)
        .run()
      return json({ success: true, marked: 'all' })
    }
    if (body.id) {
      await env.DB
        .prepare(
          `UPDATE notifications SET read_at = datetime('now')
           WHERE id = ? AND user_id = ?`
        )
        .bind(body.id, user.id)
        .run()
      return json({ success: true, marked: body.id })
    }
    return error('需要指定 id 或 all=true')
  } catch (err) {
    return error('操作失败：' + String(err), 500)
  }
}

export async function onRequestDelete(context: {
  request: Request
  env: { DB: D1Database }
}) {
  const { request, env } = context
  const { user } = await getSession(request, env.DB)
  if (!user) return error('请先登录', 401)

  const url = new URL(request.url)
  const id = Number(url.searchParams.get('id') || 0)
  const all = url.searchParams.get('all') === 'true'

  try {
    if (all) {
      await env.DB.prepare('DELETE FROM notifications WHERE user_id = ?').bind(user.id).run()
      return json({ success: true, deleted: 'all' })
    }
    if (id) {
      await env.DB
        .prepare('DELETE FROM notifications WHERE id = ? AND user_id = ?')
        .bind(id, user.id)
        .run()
      return json({ success: true, deleted: id })
    }
    return error('需要指定 id 或 all=true')
  } catch (err) {
    return error('删除失败：' + String(err), 500)
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
