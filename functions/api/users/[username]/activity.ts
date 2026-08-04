// /api/users/:username/activity
// GET → 用户最近 50 条活动（发帖 / 评论 / 点赞 / 收藏），按 created_at DESC 合并

import { json, error } from '../../_helpers'

interface ActivityItem {
  type: 'post' | 'comment' | 'like' | 'favorite'
  target_id: number
  target_title: string
  target_slug: string
  created_at: string
}

export async function onRequestGet(context: {
  params: { username: string }
  env: { DB: D1Database }
}) {
  const { params, env } = context
  const username = decodeURIComponent(params.username)

  // 先查用户 id
  const user = await env.DB
    .prepare('SELECT id FROM users WHERE username = ?')
    .bind(username)
    .first<{ id: number }>()
  if (!user) return error('用户不存在', 404)

  const items: ActivityItem[] = []

  try {
    // 发帖（仅已发布）
    const posts = await env.DB
      .prepare(
        `SELECT id, title, slug, created_at FROM posts
         WHERE author_id = ? AND published = 1
         ORDER BY created_at DESC LIMIT 50`
      )
      .bind(user.id)
      .all<{ id: number; title: string; slug: string; created_at: string }>()
    for (const p of posts.results || []) {
      items.push({
        type: 'post',
        target_id: p.id,
        target_title: p.title,
        target_slug: p.slug,
        created_at: p.created_at,
      })
    }
  } catch {
    // posts 表缺失
  }

  try {
    // 评论
    const comments = await env.DB
      .prepare(
        `SELECT c.id, c.post_id, c.created_at, p.title, p.slug
         FROM comments c
         LEFT JOIN posts p ON c.post_id = p.id
         WHERE c.user_id = ?
         ORDER BY c.created_at DESC LIMIT 50`
      )
      .bind(user.id)
      .all<{ id: number; post_id: number; created_at: string; title: string | null; slug: string | null }>()
    for (const c of comments.results || []) {
      items.push({
        type: 'comment',
        target_id: c.post_id,
        target_title: c.title || '(已删除文章)',
        target_slug: c.slug || '',
        created_at: c.created_at,
      })
    }
  } catch {
    // comments 表缺失
  }

  try {
    // 点赞
    const likes = await env.DB
      .prepare(
        `SELECT l.post_id, l.created_at, p.title, p.slug
         FROM likes l
         LEFT JOIN posts p ON l.post_id = p.id
         WHERE l.user_id = ?
         ORDER BY l.created_at DESC LIMIT 50`
      )
      .bind(user.id)
      .all<{ post_id: number; created_at: string; title: string | null; slug: string | null }>()
    for (const l of likes.results || []) {
      items.push({
        type: 'like',
        target_id: l.post_id,
        target_title: l.title || '(已删除文章)',
        target_slug: l.slug || '',
        created_at: l.created_at,
      })
    }
  } catch {
    // likes 表缺失
  }

  try {
    // 收藏
    const favs = await env.DB
      .prepare(
        `SELECT f.post_id, f.created_at, p.title, p.slug
         FROM favorites f
         LEFT JOIN posts p ON f.post_id = p.id
         WHERE f.user_id = ?
         ORDER BY f.created_at DESC LIMIT 50`
      )
      .bind(user.id)
      .all<{ post_id: number; created_at: string; title: string | null; slug: string | null }>()
    for (const f of favs.results || []) {
      items.push({
        type: 'favorite',
        target_id: f.post_id,
        target_title: f.title || '(已删除文章)',
        target_slug: f.slug || '',
        created_at: f.created_at,
      })
    }
  } catch {
    // favorites 表缺失
  }

  // 合并并按 created_at DESC 排序，取前 50 条
  items.sort((a, b) => {
    const ta = new Date(a.created_at.replace(' ', 'T') + 'Z').getTime()
    const tb = new Date(b.created_at.replace(' ', 'T') + 'Z').getTime()
    return tb - ta
  })

  return json({ activities: items.slice(0, 50) })
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
