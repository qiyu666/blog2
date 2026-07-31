// /api/posts/[id]
// GET    → fetch a single post by slug or numeric id (also increments views)
// PUT    → update a post by numeric id (owner or admin only)
// DELETE → delete a post by numeric id (owner or admin only)

import { json, error, slugify, uniqueSlug } from '../../_helpers'
import { getSession, cleanText } from '../../_auth'

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
}

function isNumeric(s: string): boolean {
  return /^\d+$/.test(s)
}

async function getPostWithStats(db: D1Database, idParam: string) {
  const numeric = isNumeric(idParam)
  let post

  if (numeric) {
    post = await db
      .prepare(
        `SELECT p.*, u.username AS author_username, u.avatar AS author_avatar,
          (SELECT COUNT(*) FROM likes l WHERE l.post_id = p.id) AS likes_count,
          (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) AS comments_count
         FROM posts p LEFT JOIN users u ON p.author_id = u.id
         WHERE p.id = ?`
      )
      .bind(Number(idParam))
      .first()
    if (post) return post
  }

  post = await db
    .prepare(
      `SELECT p.*, u.username AS author_username, u.avatar AS author_avatar,
        (SELECT COUNT(*) FROM likes l WHERE l.post_id = p.id) AS likes_count,
        (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) AS comments_count
       FROM posts p LEFT JOIN users u ON p.author_id = u.id
       WHERE p.slug = ?`
    )
    .bind(idParam)
    .first()

  return post
}

export async function onRequestGet(context: {
  params: { id: string }
  request: Request
  env: { DB: D1Database }
}) {
  const { id } = context.params
  const { DB } = context.env
  const { request } = context

  try {
    const post = await getPostWithStats(DB, id)
    if (!post) {
      return error('Post not found', 404)
    }

    // Drafts are only visible to their author or an admin.
    if (post.published === 0) {
      const { user } = await getSession(request, DB)
      const isAuthor = !!user && post.author_id === user.id
      const isAdmin = !!user && user.role === 'admin'
      if (!isAuthor && !isAdmin) {
        return error('Post not found', 404)
      }
    }

    DB.prepare('UPDATE posts SET views = views + 1 WHERE id = ?')
      .bind(post.id)
      .run()
      .catch(() => {})

    return json(post)
  } catch (err) {
    if (String(err).includes('no such table')) {
      return error('Post not found', 404)
    }
    return error('Failed to fetch post', 500)
  }
}

export async function onRequestPut(context: {
  request: Request
  params: { id: string }
  env: { DB: D1Database }
}) {
  const { request, params, env } = context
  const postId = Number(params.id)

  if (!postId) {
    return error('Invalid post id')
  }

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

  const existing = await env.DB.prepare('SELECT * FROM posts WHERE id = ?')
    .bind(postId)
    .first<{ author_id: number | null; title: string; slug: string; is_pinned: number; is_featured: number }>()
  if (!existing) {
    return error('Post not found', 404)
  }

  // Authorization: owner or admin
  if (existing.author_id !== user.id && user.role !== 'admin') {
    return error('无权编辑此帖', 403)
  }

  const title = cleanText(body.title, 200).trim()
  const content = cleanText(body.content, 50000)
  const excerpt = cleanText(body.excerpt, 500).trim() || content.slice(0, 150) + '...'
  const category = cleanText(body.category, 50).trim() || 'General'
  const tags = cleanText(body.tags, 200).trim()
  const cover_image = cleanText(body.cover_image, 500).trim()
  const custom_js = cleanText(body.custom_js || '', 20000)

  if (!title || !content) {
    return error('标题和内容不能为空')
  }

  // Draft support: published defaults to 1, 0 keeps/toggles it as a draft.
  const published = body.published === 0 ? 0 : 1

  // is_pinned / is_featured: admin can set them; non-admin preserves existing values.
  const isAdmin = user.role === 'admin'
  const is_pinned = isAdmin ? (body.is_pinned === 1 ? 1 : 0) : (existing.is_pinned || 0)
  const is_featured = isAdmin ? (body.is_featured === 1 ? 1 : 0) : (existing.is_featured || 0)

  const newSlug = title !== existing.title
    ? await uniqueSlug(env.DB, slugify(title), postId)
    : existing.slug

  try {
    await env.DB.prepare(
      `UPDATE posts SET
        title = ?, slug = ?, excerpt = ?, content = ?,
        category = ?, tags = ?, cover_image = ?,
        published = ?, is_pinned = ?, is_featured = ?,
        custom_js = ?,
        updated_at = datetime('now')
       WHERE id = ?`
    )
      .bind(title, newSlug, excerpt, content, category, tags, cover_image, published, is_pinned, is_featured, custom_js, postId)
      .run()

    const updated = await getPostWithStats(env.DB, String(postId))
    return json(updated)
  } catch (err) {
    return error('Failed to update post: ' + String(err), 500)
  }
}

export async function onRequestDelete(context: {
  request: Request
  params: { id: string }
  env: { DB: D1Database }
}) {
  const { request, params, env } = context
  const { DB } = env
  const postId = Number(params.id)

  if (!postId) {
    return error('Invalid post id')
  }

  const { user } = await getSession(request, DB)
  if (!user) {
    return error('请先登录', 401)
  }

  const existing = await DB.prepare('SELECT author_id FROM posts WHERE id = ?')
    .bind(postId)
    .first<{ author_id: number | null }>()
  if (!existing) {
    return error('Post not found', 404)
  }

  if (existing.author_id !== user.id && user.role !== 'admin') {
    return error('无权删除此帖', 403)
  }

  try {
    await DB.prepare('DELETE FROM posts WHERE id = ?').bind(postId).run()
    return json({ success: true, id: postId })
  } catch (err) {
    return error('Failed to delete post', 500)
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
