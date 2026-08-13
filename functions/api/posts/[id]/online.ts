// /api/posts/[id]/online
// GET → 获取当前在线人数
// POST → 发送心跳（续期在线状态）

import { json, error } from '../../_helpers'

const HEARTBEAT_TIMEOUT = 60 // 秒，超过此时间视为离线

async function ensureOnlineTable(db: D1Database): Promise<void> {
  await db
    .prepare(
      `CREATE TABLE IF NOT EXISTS post_online (
        post_id INTEGER NOT NULL,
        session_id TEXT NOT NULL,
        last_heartbeat INTEGER NOT NULL,
        PRIMARY KEY (post_id, session_id)
      )`
    )
    .run()
}

export async function onRequestGet(context: {
  params: { id: string }
  request: Request
  env: { DB: D1Database }
}) {
  const { id } = context.params
  const { DB } = context
  const postId = Number(id)

  if (!postId) {
    return error('Invalid post id')
  }

  try {
    await ensureOnlineTable(DB)

    const now = Math.floor(Date.now() / 1000)
    const cutoff = now - HEARTBEAT_TIMEOUT

    // 清理过期记录
    await DB.prepare('DELETE FROM post_online WHERE last_heartbeat < ?')
      .bind(cutoff)
      .run()

    // 统计当前在线人数
    const result = await DB.prepare(
      'SELECT COUNT(*) AS count FROM post_online WHERE post_id = ? AND last_heartbeat >= ?'
    )
      .bind(postId, cutoff)
      .first<{ count: number }>()

    return json({ post_id: postId, online: result?.count ?? 0 })
  } catch (err) {
    if (String(err).includes('no such table')) {
      return json({ post_id: postId, online: 0 })
    }
    return error('Failed to get online count', 500)
  }
}

export async function onRequestPost(context: {
  params: { id: string }
  request: Request
  env: { DB: D1Database }
}) {
  const { id } = context.params
  const { DB } = context
  const postId = Number(id)

  if (!postId) {
    return error('Invalid post id')
  }

  let body: { session_id?: string }
  try {
    body = await context.request.json()
  } catch {
    return error('Invalid JSON body')
  }

  const sessionId = (body.session_id || '').trim()
  if (!sessionId) {
    return error('session_id is required', 400)
  }

  try {
    await ensureOnlineTable(DB)

    const now = Math.floor(Date.now() / 1000)

    await DB.prepare(
      `INSERT INTO post_online (post_id, session_id, last_heartbeat)
       VALUES (?, ?, ?)
       ON CONFLICT(post_id, session_id) DO UPDATE SET last_heartbeat = ?`
    )
      .bind(postId, sessionId, now, now)
      .run()

    return json({ success: true })
  } catch (err) {
    return error('Failed to record heartbeat', 500)
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
