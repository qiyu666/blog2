// /api/admin/posts/[id]
// PATCH → set is_pinned and/or is_featured on a post (admin only, rate-limited)
//   body: { is_pinned?: 0|1, is_featured?: 0|1 }

import { json, error } from '../../_helpers'
import { getSession } from '../../_auth'
import { enforceAdminRateLimit } from '../../_rate-limit'

export async function onRequestPatch(context: {
  request: Request
  params: { id: string }
  env: { DB: D1Database }
}) {
  const { request, params, env } = context
  const postId = Number(params.id)
  if (!postId) {
    return error('Invalid post id')
  }

  // Pre-auth throttle: catches anonymous scanners hitting /api/admin/*.
  const unauthLimit = await enforceAdminRateLimit(env.DB, request, false)
  if (unauthLimit) return unauthLimit

  const { user } = await getSession(request, env.DB)
  if (!user) return error('请先登录', 401)
  if (user.role !== 'admin') return error('无权访问', 403)

  // Authenticated admin: apply the higher cap.
  const authLimit = await enforceAdminRateLimit(env.DB, request, true)
  if (authLimit) return authLimit

  let body: { is_pinned?: number; is_featured?: number }
  try {
    body = await request.json()
  } catch {
    return error('请求体格式错误')
  }

  // Build a partial UPDATE so callers can set one or both fields.
  const sets: string[] = []
  const binds: (string | number)[] = []

  if (body.is_pinned === 0 || body.is_pinned === 1) {
    sets.push('is_pinned = ?')
    binds.push(body.is_pinned)
  }
  if (body.is_featured === 0 || body.is_featured === 1) {
    sets.push('is_featured = ?')
    binds.push(body.is_featured)
  }

  if (sets.length === 0) {
    return error('没有可更新的字段（is_pinned 或 is_featured）')
  }

  sets.push("updated_at = datetime('now')")
  binds.push(postId)

  try {
    const existing = await env.DB
      .prepare('SELECT id FROM posts WHERE id = ?')
      .bind(postId)
      .first()
    if (!existing) return error('帖子不存在', 404)

    await env.DB.prepare(`UPDATE posts SET ${sets.join(', ')} WHERE id = ?`)
      .bind(...binds)
      .run()

    const updated = await env.DB
      .prepare(
        `SELECT id, title, slug, is_pinned, is_featured, updated_at
         FROM posts WHERE id = ?`
      )
      .bind(postId)
      .first()
    return json({ success: true, post: updated })
  } catch (err) {
    return error('更新失败：' + String(err), 500)
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'PATCH, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
