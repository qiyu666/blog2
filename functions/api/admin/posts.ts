// /api/admin/posts
// GET → list all posts with author + stats (admin only, includes unpublished)

import { json, error } from '../_helpers'
import { getSession } from '../_auth'
import { enforceAdminRateLimit } from '../_rate-limit'

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
    const result = await env.DB
      .prepare(
        `SELECT p.id, p.title, p.slug, p.category, p.published, p.views,
          p.created_at, p.updated_at, p.is_pinned, p.is_featured,
          u.username AS author_username,
          (SELECT COUNT(*) FROM likes l WHERE l.post_id = p.id) AS likes_count,
          (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) AS comments_count
         FROM posts p
         LEFT JOIN users u ON p.author_id = u.id
         ORDER BY p.is_pinned DESC, p.created_at DESC`
      )
      .all()
    return json(result.results.map((p: any) => ({
      ...p,
      status: p.published ? 'published' : 'draft',
      is_pinned: p.is_pinned || 0,
      is_featured: p.is_featured || 0,
    })))
  } catch (err) {
    return error('Failed to fetch posts: ' + String(err), 500)
  }
}

// POST → 批量操作：{ action: 'delete'|'publish'|'unpublish'|'pin'|'unpin', ids: number[] }
export async function onRequestPost(context: {
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

  let body: { action?: string; ids?: number[] }
  try {
    body = await request.json()
  } catch {
    return error('请求体格式错误', 400)
  }

  const action = body.action
  const ids = Array.isArray(body.ids) ? body.ids.filter((n) => Number.isFinite(n)) : []
  if (ids.length === 0) return error('未选择任何文章', 400)
  if (ids.length > 500) return error('单次最多操作 500 篇文章', 400)

  const validActions = new Set(['delete', 'publish', 'unpublish', 'pin', 'unpin'])
  if (!action || !validActions.has(action)) {
    return error('无效的操作类型', 400)
  }

  // 生成 IN (?, ?, ...) 占位符
  const placeholders = ids.map(() => '?').join(', ')

  try {
    if (action === 'delete') {
      // 先删依赖（点赞、评论），再删文章
      await env.DB
        .prepare(`DELETE FROM likes WHERE post_id IN (${placeholders})`)
        .bind(...ids)
        .run()
      await env.DB
        .prepare(`DELETE FROM comments WHERE post_id IN (${placeholders})`)
        .bind(...ids)
        .run()
      await env.DB
        .prepare(`DELETE FROM posts WHERE id IN (${placeholders})`)
        .bind(...ids)
        .run()
    } else if (action === 'publish') {
      await env.DB
        .prepare(`UPDATE posts SET published = 1 WHERE id IN (${placeholders})`)
        .bind(...ids)
        .run()
    } else if (action === 'unpublish') {
      await env.DB
        .prepare(`UPDATE posts SET published = 0 WHERE id IN (${placeholders})`)
        .bind(...ids)
        .run()
    } else if (action === 'pin') {
      await env.DB
        .prepare(`UPDATE posts SET is_pinned = 1 WHERE id IN (${placeholders})`)
        .bind(...ids)
        .run()
    } else if (action === 'unpin') {
      await env.DB
        .prepare(`UPDATE posts SET is_pinned = 0 WHERE id IN (${placeholders})`)
        .bind(...ids)
        .run()
    }

    return json({ success: true, action, affected: ids.length })
  } catch (err) {
    return error('批量操作失败: ' + String(err), 500)
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
