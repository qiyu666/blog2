// GET /api/admin/scheduled-publish → 发布到期的定时文章（由 cron trigger 调用）

import { json, error } from '../_helpers'
import { getSession } from '../_auth'
import { enforceAdminRateLimit } from '../_rate-limit'

export async function onRequestGet(context: {
  request: Request
  env: { DB: D1Database }
}) {
  const { request, env } = context
  const { user } = await getSession(request, env.DB)
  if (!user || user.role !== 'admin') {
    return error('无权访问', 403)
  }

  const now = new Date().toISOString().slice(0, 19).replace('T', ' ')

  const result = await env.DB
    .prepare(
      `SELECT id, title FROM posts WHERE published = 0 AND scheduled_at IS NOT NULL AND scheduled_at <= ?`
    )
    .bind(now)
    .all()

  const published: number[] = []
  for (const row of (result.results ?? []) as Array<{ id: number; title: string }>) {
    try {
      await env.DB.prepare(
        `UPDATE posts SET published = 1 WHERE id = ?`
      ).bind(row.id).run()
      published.push(row.id)
    } catch {
      // skip
    }
  }

  return json({ published_count: published.length, ids: published })
}
