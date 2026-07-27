// /api/admin/promote
// POST → promote a user to admin using ADMIN_SECRET env var
// This is the bootstrap endpoint: the FIRST admin must be created via this
// secret-protected route. Afterwards, that admin can promote others via
// /api/admin/users PATCH.
//
// Request body: { username: string, secret: string }
// Env: ADMIN_SECRET must be set in wrangler.jsonc vars or Pages dashboard.

import { json, error } from '../_helpers'
import { cleanText } from '../_auth'
import { enforceAdminRateLimit } from '../_rate-limit'

export async function onRequestPost(context: {
  request: Request
  env: { DB: D1Database; ADMIN_SECRET?: string }
}) {
  const { request, env } = context

  // Pre-auth rate limit (strict cap — this endpoint should be hit almost never).
  const unauthLimit = await enforceAdminRateLimit(env.DB, request, false)
  if (unauthLimit) return unauthLimit

  const expectedSecret = env.ADMIN_SECRET
  if (!expectedSecret) {
    return error('管理员升级未配置（未设置 ADMIN_SECRET 环境变量）', 503)
  }

  let body: { username?: string; secret?: string }
  try {
    body = await request.json()
  } catch {
    return error('请求体格式错误')
  }

  const submittedSecret = cleanText(body.secret, 200).trim()
  const username = cleanText(body.username, 50).trim()

  if (!submittedSecret) return error('缺少 secret')
  if (!username) return error('缺少 username')

  // Constant-time-ish comparison
  if (submittedSecret.length !== expectedSecret.length) return error('secret 错误', 403)
  let diff = 0
  for (let i = 0; i < submittedSecret.length; i++) {
    diff |= submittedSecret.charCodeAt(i) ^ expectedSecret.charCodeAt(i)
  }
  if (diff !== 0) return error('secret 错误', 403)

  try {
    const target = await env.DB
      .prepare('SELECT id, role FROM users WHERE username = ?')
      .bind(username)
      .first<{ id: number; role: string }>()
    if (!target) return error('用户不存在', 404)

    if (target.role === 'admin') {
      return json({ success: true, message: '该用户已是管理员', id: target.id })
    }

    await env.DB.prepare('UPDATE users SET role = ? WHERE id = ?')
      .bind('admin', target.id)
      .run()
    return json({ success: true, message: '已升级为管理员', id: target.id })
  } catch (err) {
    return error('升级失败：' + String(err), 500)
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
