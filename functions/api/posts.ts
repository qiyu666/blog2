// GET /api/posts        → list posts with stats + author
//   ?sort=trending      → order by hot score (engagement + recency)
//   ?sort=featured      → featured posts first, then others
//   ?status=draft       → current user's draft posts (requires login)
// POST /api/posts       → create a new post (requires login)
//   body.published = 0  → create as draft (default 1)
//   body.is_pinned / is_featured → admin only (default 0)

import { json, error, slugify, uniqueSlug, cachedJson } from './_helpers'
import { getSession, cleanText } from './_auth'

interface PostInput {
  title: string
  excerpt: string
  content: string
  category: string
  tags: string
  cover_image: string
  published?: number
  is_pinned?: number
  is_featured?: number
  custom_js?: string
  password?: string
}

export async function onRequestGet(context: {
  request: Request
  env: { DB: D1Database }
}) {
  const { request, env } = context
  const { DB } = env
  const url = new URL(request.url)
  const sort = url.searchParams.get('sort') || ''
  const status = url.searchParams.get('status') || ''

  let user = null
  try {
    const session = await getSession(request, DB)
    user = session.user
  } catch {
    // Session check is optional for viewing posts
  }

  try {
    let whereClause = 'WHERE p.published = 1'
    const binds: (string | number)[] = []

    if (status === 'draft') {
      if (!user) {
        return error('请先登录', 401)
      }
      whereClause = 'WHERE p.published = 0 AND p.author_id = ?'
      binds.push(user.id)
    }

    // Pinned posts always surface first.
    let sortCriteria = 'p.created_at DESC'
    if (sort === 'trending') {
      // Hot score: engagement weighted, decayed by age.
      sortCriteria =
        "(likes_count * 3 + comments_count * 2 + p.views * 0.1) + " +
        "(julianday('now') - julianday(p.created_at)) * -2 DESC"
    } else if (sort === 'featured') {
      sortCriteria = 'p.is_featured DESC, p.created_at DESC'
    }

    const result = await DB.prepare(
      `SELECT
        p.id, p.title, p.slug, p.excerpt, p.content, p.author, p.category,
        p.tags, p.cover_image, p.published, p.views, p.created_at, p.updated_at,
        p.author_id, p.is_pinned, p.is_featured,
        CASE WHEN p.password IS NOT NULL AND p.password != '' THEN 1 ELSE 0 END AS has_password,
        u.username AS author_username,
        (SELECT COUNT(*) FROM likes l WHERE l.post_id = p.id) AS likes_count,
        (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) AS comments_count
       FROM posts p
       LEFT JOIN users u ON p.author_id = u.id
       ${whereClause}
       ORDER BY p.is_pinned DESC, ${sortCriteria}`
    )
      .bind(...binds)
      .all()

    // 草稿列表涉及个人数据，不缓存；公开文章列表可缓存
    if (status === 'draft') {
      return json(result.results)
    }
    return cachedJson(result.results, { browserMaxAge: 20, cdnMaxAge: 300, swr: 120 })
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
  const custom_js = cleanText(body.custom_js || '', 20000)
  const password = (body.password || '').trim()

  if (!title || !content) {
    return error('标题和内容不能为空')
  }

  // Draft support: published defaults to 1 (published), 0 creates a draft.
  const published = body.published === 0 ? 0 : 1

  // is_pinned / is_featured are admin-only; non-admins always get 0.
  const isAdmin = user.role === 'admin'
  const is_pinned = isAdmin && body.is_pinned === 1 ? 1 : 0
  const is_featured = isAdmin && body.is_featured === 1 ? 1 : 0

  const slug = await uniqueSlug(env.DB, slugify(title))

  try {
    const result = await env.DB.prepare(
      `INSERT INTO posts (title, slug, excerpt, content, author, author_id, category, tags, cover_image, published, is_pinned, is_featured, custom_js, password)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        title,
        slug,
        excerpt,
        content,
        user.username,
        user.id,
        category,
        tags,
        cover_image,
        published,
        is_pinned,
        is_featured,
        custom_js,
        password
      )
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
