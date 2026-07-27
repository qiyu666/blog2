// /api/reports
// POST → create a report on a post / comment / user (requires login)

import { json, error } from './_helpers'
import { getSession, cleanText } from './_auth'

const ALLOWED_TARGET_TYPES = new Set(['post', 'comment', 'user'])

export async function onRequestPost(context: {
  request: Request
  env: { DB: D1Database }
}) {
  const { request, env } = context
  const { user } = await getSession(request, env.DB)
  if (!user) return error('请先登录', 401)

  let body: { target_type?: string; target_id?: number; reason?: string }
  try {
    body = await request.json()
  } catch {
    return error('请求体格式错误')
  }

  const targetType = cleanText(body.target_type, 20).trim()
  if (!ALLOWED_TARGET_TYPES.has(targetType)) {
    return error('target_type 只能是 post / comment / user')
  }

  const targetId = Number(body.target_id)
  if (!Number.isInteger(targetId) || targetId <= 0) {
    return error('target_id 必须为正整数')
  }

  const reason = cleanText(body.reason, 500).trim()
  if (!reason) return error('举报理由不能为空')

  try {
    // Verify target exists in the appropriate table.
    const existenceQuery =
      targetType === 'post'
        ? 'SELECT id FROM posts WHERE id = ?'
        : targetType === 'comment'
          ? 'SELECT id FROM comments WHERE id = ?'
          : 'SELECT id FROM users WHERE id = ?'
    const target = await env.DB.prepare(existenceQuery).bind(targetId).first()
    if (!target) return error('举报目标不存在', 404)

    // Prevent duplicate pending reports by the same user for the same target.
    const dup = await env.DB
      .prepare(
        `SELECT id FROM reports
         WHERE target_type = ? AND target_id = ? AND reporter_id = ? AND status = 'pending'`
      )
      .bind(targetType, targetId, user.id)
      .first()
    if (dup) return error('你已举报过该内容，且仍在处理中', 409)

    await env.DB
      .prepare(
        `INSERT INTO reports (reporter_id, target_type, target_id, reason)
         VALUES (?, ?, ?, ?)`
      )
      .bind(user.id, targetType, targetId, reason)
      .run()

    return json({ success: true }, 201)
  } catch (err) {
    return error('举报失败：' + String(err), 500)
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
