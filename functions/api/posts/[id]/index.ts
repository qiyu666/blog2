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
}

function isNumeric(s: string): boolean {
  return /^\d+$/.test(s)
}

async function getPostWithStats(db: D1Database, idParam: string) {
  const query = isNumeric(idParam)
    ? `SELECT p.*, u.username AS author_username,
        (SELECT COUNT(*) FROM likes l WHERE l.post_id = p.id) AS likes_count,
        (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) AS comments_count
       FROM posts p LEFT JOIN users u ON p.author_id = u.id
       WHERE p.id = ?`
    : `SELECT p.*, u.username AS author_username,
        (SELECT COUNT(*) FROM likes l WHERE l.post_id = p.id) AS likes_count,
        (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) AS comments_count
       FROM posts p LEFT JOIN users u ON p.author_id = u.id
       WHERE p.slug = ?`
  return db.prepare(query).bind(idParam).first()
}

export async function onRequestGet(context: {
  params: { id: string }
  env: { DB: D1Database }
}) {
  const { id } = context.params
  const { DB } = context.env

  try {
    const post = await getPostWithStats(DB, id)
    if (!post) {
      return error('Post not found', 404)
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
    .first<{ author_id: number | null; title: string; slug: string }>()
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

  if (!title || !content) {
    return error('标题和内容不能为空')
  }

  const newSlug = title !== existing.title
    ? await uniqueSlug(env.DB, slugify(title), postId)
    : existing.slug

  try {
    await env.DB.prepare(
      `UPDATE posts SET
        title = ?, slug = ?, excerpt = ?, content = ?,
        category = ?, tags = ?, cover_image = ?,
        updated_at = datetime('now')
       WHERE id = ?`
    )
      .bind(title, newSlug, excerpt, content, category, tags, cover_image, postId)
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
