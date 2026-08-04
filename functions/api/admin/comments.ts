// /api/admin/comments
// GET   → list comments with optional ?status=pending filter (admin only)
// PATCH → moderate a comment: { id, action: 'approve'|'reject'|'spam' } (admin only)

import { json, error } from '../_helpers'
import { getSession, cleanText } from '../_auth'
import { enforceAdminRateLimit } from '../_rate-limit'

const ALLOWED_ACTIONS = new Set(['approve', 'reject', 'spam'])
const ACTION_TO_STATUS: Record<string, string> = {
  approve: 'approved',
  reject: 'rejected',
  spam: 'spam',
}

/** 确保 comments 表有 status 列（兼容旧库）。SQLite 的 ALTER TABLE ADD COLUMN
 *  没有 IF NOT EXISTS，所以用 try/catch 忽略“duplicate column”错误。 */
async function ensureCommentsStatusColumn(db: D1Database): Promise<void> {
  try {
    await db.prepare(`ALTER TABLE comments ADD COLUMN status TEXT NOT NULL DEFAULT 'approved'`).run()
  } catch (err) {
    if (!String(err).includes('duplicate column')) {
      // 列已存在是正常情况，其它错误继续抛出
      throw err
    }
  }
}

export async function onRequestGet(context: {
  request: Request
  env: { DB: D1Database }
}) {
  const { request, env } = context
  const unauthLimit = await enforceAdminRateLimit(env.DB, request, false)
  if (unauthLimit) return unauthLimit

  const { user } = await getSession(request, env.DB)
  if (!user) return error('请先登录', 401)
  if (user.role !== 'admin') return error('无权访问', 403)

  const authLimit = await enforceAdminRateLimit(env.DB, request, true)
  if (authLimit) return authLimit

  await ensureCommentsStatusColumn(env.DB)

  const url = new URL(request.url)
  const status = url.searchParams.get('status')

  try {
    let result
    if (status === 'pending' || status === 'spam' || status === 'rejected') {
      result = await env.DB
        .prepare(
          `SELECT c.id, c.content, c.created_at, c.post_id, c.status,
            u.username AS author_username,
            p.title AS post_title, p.slug AS post_slug
           FROM comments c
           JOIN users u ON c.user_id = u.id
           JOIN posts p ON c.post_id = p.id
           WHERE c.status = ?
           ORDER BY c.created_at DESC
           LIMIT 500`
        )
        .bind(status)
        .all()
    } else {
      result = await env.DB
        .prepare(
          `SELECT c.id, c.content, c.created_at, c.post_id, c.status,
            u.username AS author_username,
            p.title AS post_title, p.slug AS post_slug
           FROM comments c
           JOIN users u ON c.user_id = u.id
           JOIN posts p ON c.post_id = p.id
           ORDER BY c.created_at DESC
           LIMIT 500`
        )
        .all()
    }
    return json(result.results)
  } catch (err) {
    return error('Failed to fetch comments: ' + String(err), 500)
  }
}

export async function onRequestPatch(context: {
  request: Request
  env: { DB: D1Database }
}) {
  const { request, env } = context
  const unauthLimit = await enforceAdminRateLimit(env.DB, request, false)
  if (unauthLimit) return unauthLimit

  const { user } = await getSession(request, env.DB)
  if (!user) return error('请先登录', 401)
  if (user.role !== 'admin') return error('无权访问', 403)

  const authLimit = await enforceAdminRateLimit(env.DB, request, true)
  if (authLimit) return authLimit

  await ensureCommentsStatusColumn(env.DB)

  let body: { id?: number; action?: string }
  try {
    body = await request.json()
  } catch {
    return error('请求体格式错误')
  }

  const id = Number(body.id)
  if (!Number.isInteger(id) || id <= 0) return error('缺少有效的评论 id')

  const action = cleanText(body.action || '', 20).trim()
  if (!ALLOWED_ACTIONS.has(action)) {
    return error('action 只能是 approve、reject 或 spam')
  }

  const newStatus = ACTION_TO_STATUS[action]

  try {
    const target = await env.DB
      .prepare('SELECT id FROM comments WHERE id = ?')
      .bind(id)
      .first()
    if (!target) return error('评论不存在', 404)

    await env.DB
      .prepare('UPDATE comments SET status = ? WHERE id = ?')
      .bind(newStatus, id)
      .run()

    return json({ success: true, id, status: newStatus })
  } catch (err) {
    return error('更新失败：' + String(err), 500)
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, PATCH, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
