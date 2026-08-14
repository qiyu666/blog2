import type { Context, HonoRequest } from 'hono'
import { APIError, requireAuth } from '../utils'

const DB = process.env.BLOG_DB

export const GET = async (c: Context<HonoRequest>) => {
  if (!DB) return APIError('DATABASE_NOT_CONFIGURED', 500)
  const auth = await requireAuth(c)
  if (!auth) return auth
  const userId = (auth as { id: number }).id

  const today = new Date().toISOString().slice(0, 10)
  const thirtyAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)

  const checkins = await DB.prepare(
    `SELECT check_in_date, COUNT(*) as count
     FROM reading_checkins
     WHERE user_id = ? AND check_in_date >= ?
     GROUP BY check_in_date
     ORDER BY check_in_date DESC`
  ).bind(userId, thirtyAgo).all()

  const streak = await DB.prepare(
    `SELECT COUNT(*) as streak FROM (
      SELECT check_in_date,
             ROW_NUMBER() OVER (ORDER BY check_in_date DESC) as rn
      FROM reading_checkins
      WHERE user_id = ?
      GROUP BY check_in_date
      HAVING check_in_date >= date('now', '-30 days')
      ORDER BY check_in_date DESC
    ) sub
    WHERE rn <= (
      SELECT COUNT(DISTINCT check_in_date)
      FROM reading_checkins
      WHERE user_id = ? AND check_in_date >= date('now')
    )
  `).bind(userId, userId).first()

  const totalCheckins = await DB.prepare(
    `SELECT COUNT(DISTINCT check_in_date) as total FROM reading_checkins WHERE user_id = ?`
  ).bind(userId).first()

  return c.json({
    checkins: checkins.results?.map((r: any) => r.check_in_date) || [],
    streak: streak?.streak || 0,
    total_checkins: totalCheckins?.total || 0,
  })
}

export const POST = async (c: Context<HonoRequest>) => {
  if (!DB) return APIError('DATABASE_NOT_CONFIGURED', 500)
  const auth = await requireAuth(c)
  if (!auth) return auth
  const userId = (auth as { id: number }).id

  const { post_id } = await c.req.json().catch(() => ({}))
  if (!post_id) return APIError('MISSING_POST_ID', 400)

  const post = await DB.prepare(
    `SELECT id FROM posts WHERE id = ? AND published = 1`
  ).bind(post_id).first<{ id: number }>()

  if (!post) return APIError('POST_NOT_FOUND', 404)

  const today = new Date().toISOString().slice(0, 10)
  await DB.prepare(
    `INSERT OR IGNORE INTO reading_checkins (user_id, post_id, check_in_date) VALUES (?, ?, ?)`
  ).bind(userId, post_id, today).run()

  return c.json({ success: true })
}
