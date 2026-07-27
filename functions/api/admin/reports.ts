// /api/admin/reports
// GET   → list all reports with reporter + target info (admin only)
// PATCH → update report status (admin only)

import { json, error } from '../_helpers'
import { getSession, cleanText } from '../_auth'
import { enforceAdminRateLimit } from '../_rate-limit'

const ALLOWED_STATUSES = new Set(['resolved', 'dismissed'])

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

  try {
    // Fetch reports joined with reporter username. We pull target info per-row
    // via correlated subqueries so all three target types can be returned in
    // a single query without union gymnastics.
    const result = await env.DB
      .prepare(
        `SELECT r.id, r.target_type, r.target_id, r.reason, r.status,
           r.resolved_by, r.resolved_at, r.created_at,
           ru.username AS reporter_username,
           CASE
             WHEN r.target_type = 'post'
               THEN (SELECT title FROM posts WHERE id = r.target_id)
             WHEN r.target_type = 'comment'
               THEN substr((SELECT content FROM comments WHERE id = r.target_id), 1, 120)
             WHEN r.target_type = 'user'
               THEN (SELECT username FROM users WHERE id = r.target_id)
           END AS target_label
         FROM reports r
         LEFT JOIN users ru ON r.reporter_id = ru.id
         ORDER BY r.created_at DESC
         LIMIT 200`
      )
      .all()
    return json(result.results)
  } catch (err) {
    return error('Failed to fetch reports: ' + String(err), 500)
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

  let body: { id?: number; status?: string }
  try {
    body = await request.json()
  } catch {
    return error('请求体格式错误')
  }

  const id = Number(body.id)
  if (!Number.isInteger(id) || id <= 0) return error('缺少有效的举报 id')

  const status = cleanText(body.status, 20).trim()
  if (!ALLOWED_STATUSES.has(status)) {
    return error('status 只能是 resolved 或 dismissed')
  }

  try {
    const target = await env.DB
      .prepare('SELECT id FROM reports WHERE id = ?')
      .bind(id)
      .first()
    if (!target) return error('举报不存在', 404)

    await env.DB
      .prepare(
        `UPDATE reports
         SET status = ?, resolved_by = ?, resolved_at = datetime('now')
         WHERE id = ?`
      )
      .bind(status, user.id, id)
      .run()

    return json({ success: true, id, status })
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
