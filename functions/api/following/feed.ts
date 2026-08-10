// /api/following/feed
// GET → 返回当前登录用户关注的用户发布的最新文章列表
// 需要登录，返回 { posts: Post[], has_more: boolean }

import { json, error } from '../_helpers'
import { getSession } from '../_auth'

interface FeedPost {
  id: number
  title: string
  slug: string
  excerpt: string
  category: string
  cover_image: string | null
  created_at: string
  author_username: string
  author_display_name: string | null
  author_avatar: string | null
  views: number
  likes_count: number
  comments_count: number
}

export async function onRequestGet(context: {
  request: Request
  env: { DB: D1Database }
}) {
  const { request, env } = context
  const { user } = await getSession(request, env.DB)
  if (!user) return error('请先登录', 401)

  const url = new URL(request.url)
  const limit = 20
  const cursor = url.searchParams.get('cursor') || '0'

  try {
    // 查询关注用户的最新文章
    const stmt = `
      SELECT p.id, p.title, p.slug, p.excerpt, p.category, p.cover_image,
             p.created_at, p.views,
             u.username AS author_username,
             u.display_name AS author_display_name,
             u.avatar AS author_avatar,
             (SELECT COUNT(*) FROM likes l WHERE l.post_id = p.id) AS likes_count,
             (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) AS comments_count
      FROM posts p
      JOIN follows f ON p.author_id = f.following_id
      JOIN users u ON p.author_id = u.id
      WHERE f.follower_id = ?
        AND p.published = 1
        AND p.created_at < datetime(?, 'localtime')
      ORDER BY p.created_at DESC
      LIMIT ?
    `

    const result = await env.DB
      .prepare(stmt)
      .bind(user.id, cursor, limit + 1)
      .all<FeedPost>()

    const posts = result.results
    const hasMore = posts.length > limit
    const feedPosts = hasMore ? posts.slice(0, limit) : posts
    const nextCursor = hasMore && feedPosts.length > 0
      ? new Date(feedPosts[feedPosts.length - 1].created_at + 'Z').toISOString()
      : null

    return json({
      posts: feedPosts,
      has_more: hasMore,
      next_cursor: nextCursor,
    })
  } catch (err) {
    return error('获取关注动态失败：' + String(err), 500)
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
