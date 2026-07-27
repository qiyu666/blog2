// /api/admin/analytics
// GET → aggregated analytics for the admin dashboard (admin only)

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
    // Run all queries in parallel for lower latency.
    const [
      userGrowth,
      postGrowth,
      commentGrowth,
      categoryDist,
      topPosts,
      topUsers,
      overview,
    ] = await Promise.all([
      env.DB
        .prepare(
          `SELECT date(created_at) AS day, COUNT(*) AS count
           FROM users
           WHERE created_at > datetime('now', '-30 days')
           GROUP BY day
           ORDER BY day ASC`
        )
        .all(),
      env.DB
        .prepare(
          `SELECT date(created_at) AS day, COUNT(*) AS count
           FROM posts
           WHERE created_at > datetime('now', '-30 days')
           GROUP BY day
           ORDER BY day ASC`
        )
        .all(),
      env.DB
        .prepare(
          `SELECT date(created_at) AS day, COUNT(*) AS count
           FROM comments
           WHERE created_at > datetime('now', '-30 days')
           GROUP BY day
           ORDER BY day ASC`
        )
        .all(),
      env.DB
        .prepare(
          `SELECT category, COUNT(*) AS count
           FROM posts
           WHERE published = 1
           GROUP BY category
           ORDER BY count DESC`
        )
        .all(),
      env.DB
        .prepare(
          `SELECT p.id, p.title, p.slug, p.category, p.views,
             (SELECT COUNT(*) FROM likes l WHERE l.post_id = p.id) AS likes_count,
             (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) AS comments_count,
             (p.views
               + (SELECT COUNT(*) FROM likes l WHERE l.post_id = p.id) * 5
               + (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) * 3
             ) AS score
           FROM posts p
           WHERE p.published = 1
           ORDER BY score DESC
           LIMIT 10`
        )
        .all(),
      env.DB
        .prepare(
          `SELECT u.id, u.username, u.avatar,
             (SELECT COUNT(*) FROM posts p WHERE p.author_id = u.id AND p.published = 1) AS post_count
           FROM users u
           ORDER BY post_count DESC
           LIMIT 10`
        )
        .all(),
      // Overview stats — each scalar fetched in one round-trip via a UNION-style
      // single query is awkward in D1, so issue them as parallel first() calls.
      Promise.all([
        env.DB.prepare('SELECT COUNT(*) AS c FROM users').first<{ c: number }>(),
        env.DB.prepare('SELECT COUNT(*) AS c FROM posts').first<{ c: number }>(),
        env.DB.prepare('SELECT COUNT(*) AS c FROM comments').first<{ c: number }>(),
        env.DB.prepare('SELECT COUNT(*) AS c FROM likes').first<{ c: number }>(),
        env.DB
          .prepare('SELECT COALESCE(SUM(views), 0) AS c FROM posts')
          .first<{ c: number }>(),
        env.DB
          .prepare("SELECT COUNT(*) AS c FROM reports WHERE status = 'pending'")
          .first<{ c: number }>(),
      ]).then(
        ([
          users,
          posts,
          comments,
          likes,
          views,
          pendingReports,
        ]) => ({
          users: users?.c || 0,
          posts: posts?.c || 0,
          comments: comments?.c || 0,
          likes: likes?.c || 0,
          views: views?.c || 0,
          pendingReports: pendingReports?.c || 0,
        })
      ),
    ])

    return json({
      userGrowth: userGrowth.results,
      postGrowth: postGrowth.results,
      commentGrowth: commentGrowth.results,
      categoryDist: categoryDist.results,
      topPosts: topPosts.results,
      topUsers: topUsers.results,
      overview,
    })
  } catch (err) {
    return error('Failed to fetch analytics: ' + String(err), 500)
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
