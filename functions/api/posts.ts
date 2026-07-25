// GET /api/posts        → list all posts (newest first) with stats + author
// POST /api/posts       → create a new post (requires login)

import { json, error, slugify, uniqueSlug } from './_helpers'
import { getSession, cleanText } from './_auth'

interface PostInput {
  title: string
  excerpt: string
  content: string
  category: string
  tags: string
  cover_image: string
}

export async function onRequestGet(context: { env: { DB: D1Database } }) {
  const { DB } = context.env
  try {
    const result = await DB.prepare(
      `SELECT
        p.id, p.title, p.slug, p.excerpt, p.content, p.author, p.category,
        p.tags, p.cover_image, p.published, p.views, p.created_at, p.updated_at,
        p.author_id,
        u.username AS author_username,
        (SELECT COUNT(*) FROM likes l WHERE l.post_id = p.id) AS likes_count,
        (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) AS comments_count
       FROM posts p
       LEFT JOIN users u ON p.author_id = u.id
       WHERE p.published = 1
       ORDER BY p.created_at DESC`
    ).all()
    return json(result.results)
  } catch (err) {
    if (String(err).includes('no such table')) {
      return json([])
    }
    return error('Failed to fetch posts', 500)
  }
}

export async function onRequestPost(context: {
  request: Request
  env: { DB: D1Database }
}) {
  const { request, env } = context
  const { user } = await getSession(request, env.DB)
  if (!user) {
    return error('请先登录', 401)
  }

  let body: PostInput
  try {
    body = await request.json()
  } catch {
    return error('Invalid JSON body')
  }

  const title = cleanText(body.title, 200).trim()
  const content = cleanText(body.content, 50000)
  const excerpt = cleanText(body.excerpt, 500).trim() || content.slice(0, 150) + '...'
  const category = cleanText(body.category, 50).trim() || 'General'
  const tags = cleanText(body.tags, 200).trim()
  const cover_image = cleanText(body.cover_image, 500).trim()

  if (!title || !content) {
    return error('标题和内容不能为空')
  }

  const slug = await uniqueSlug(env.DB, slugify(title))

  try {
    const result = await env.DB.prepare(
      `INSERT INTO posts (title, slug, excerpt, content, author, author_id, category, tags, cover_image)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(title, slug, excerpt, content, user.username, user.id, category, tags, cover_image)
      .run()

    const post = await env.DB
      .prepare(
        `SELECT p.*, u.username AS author_username,
          (SELECT COUNT(*) FROM likes l WHERE l.post_id = p.id) AS likes_count,
          (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) AS comments_count
         FROM posts p LEFT JOIN users u ON p.author_id = u.id
         WHERE p.id = ?`
      )
      .bind(result.meta.last_row_id)
      .first()

    return json(post, 201)
  } catch (err) {
    return error('Failed to create post: ' + String(err), 500)
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
