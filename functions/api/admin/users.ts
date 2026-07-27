// /api/admin/users
// GET   → list all users (admin only)
// PATCH → update user role (admin only)

import { json, error } from '../_helpers'
import { getSession, cleanText } from '../_auth'
import { enforceAdminRateLimit } from '../_rate-limit'

export async function onRequestGet(context: {
  request: Request
  env: { DB: D1Database }
}) {
  const { request, env } = context
  // Pre-auth rate limit: even anonymous scanners get throttled hard here.
  const unauthLimit = await enforceAdminRateLimit(env.DB, request, false)
  if (unauthLimit) return unauthLimit

  const { user } = await getSession(request, env.DB)
  if (!user) return error('请先登录', 401)
  if (user.role !== 'admin') return error('无权访问', 403)

  // Authenticated admin: apply the higher cap.
  const authLimit = await enforceAdminRateLimit(env.DB, request, true)
  if (authLimit) return authLimit

  try {
    const result = await env.DB
      .prepare(
        `SELECT id, username, email, role, avatar, bio, created_at,
          (SELECT COUNT(*) FROM posts p WHERE p.author_id = u.id) AS posts_count,
          (SELECT COUNT(*) FROM comments c WHERE c.user_id = u.id) AS comments_count
         FROM users u
         ORDER BY u.created_at DESC`
      )
      .all()
    return json(result.results)
  } catch (err) {
    return error('Failed to fetch users: ' + String(err), 500)
  }
}

export async function onRequestPatch(context: {
  request: Request
  params: { id: string }
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

  let body: { role?: string }
  try {
    body = await request.json()
  } catch {
    return error('请求体格式错误')
  }

  const role = cleanText(body.role, 20).trim()
  if (role !== 'member' && role !== 'admin') {
    return error('角色只能是 member 或 admin')
  }

  // Support both /api/admin/users?id=123 and /api/admin/users/123 via PATCH body
  const url = new URL(request.url)
  const userId = Number(url.searchParams.get('id') || 0)
  if (!userId) return error('缺少用户 id')

  if (userId === user.id && role !== 'admin') {
    return error('不能取消自己的管理员权限')
  }

  try {
    const target = await env.DB
      .prepare('SELECT id FROM users WHERE id = ?')
      .bind(userId)
      .first()
    if (!target) return error('用户不存在', 404)

    await env.DB.prepare('UPDATE users SET role = ? WHERE id = ?')
      .bind(role, userId)
      .run()
    return json({ success: true, id: userId, role })
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
