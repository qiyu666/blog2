// /api/posts/[id]
// GET    → fetch a single post by slug or numeric id (also increments views)
// PUT    → update a post by numeric id
// DELETE → delete a post by numeric id

import { json, error, slugify, uniqueSlug } from '../_helpers'

interface PostInput {
  title: string
  excerpt: string
  content: string
  author: string
  category: string
  tags: string
  cover_image: string
}

function isNumeric(s: string): boolean {
  return /^\d+$/.test(s)
}

export async function onRequestGet(context: {
  params: { id: string }
  env: { DB: D1Database }
}) {
  const { id } = context.params
  const { DB } = context.env

  try {
    // Try by slug first, then by numeric id
    const query = isNumeric(id)
      ? 'SELECT * FROM posts WHERE id = ?'
      : 'SELECT * FROM posts WHERE slug = ?'

    const post = await DB.prepare(query).bind(id).first()

    if (!post) {
      return error('Post not found', 404)
    }

    // Increment views (fire and forget, don't block the response)
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

  let body: PostInput
  try {
    body = await request.json()
  } catch {
    return error('Invalid JSON body')
  }

  const { title, excerpt, content, author, category, tags, cover_image } = body

  if (!title?.trim() || !content?.trim()) {
    return error('Title and content are required')
  }

  // Check post exists
  const existing = await env.DB.prepare('SELECT * FROM posts WHERE id = ?')
    .bind(postId)
    .first()
  if (!existing) {
    return error('Post not found', 404)
  }

  // Update slug only if title changed
  const newSlug = title !== existing.title
    ? await uniqueSlug(env.DB, slugify(title), postId)
    : existing.slug

  try {
    await env.DB.prepare(
      `UPDATE posts SET
        title = ?, slug = ?, excerpt = ?, content = ?,
        author = ?, category = ?, tags = ?, cover_image = ?,
        updated_at = datetime('now')
       WHERE id = ?`
    )
      .bind(
        title.trim(),
        newSlug,
        (excerpt || '').trim() || content.slice(0, 150) + '...',
        content,
        (author || 'Anonymous').trim(),
        (category || 'General').trim(),
        (tags || '').trim(),
        (cover_image || '').trim(),
        postId
      )
      .run()

    const updated = await env.DB.prepare('SELECT * FROM posts WHERE id = ?')
      .bind(postId)
      .first()

    return json(updated)
  } catch (err) {
    return error('Failed to update post: ' + String(err), 500)
  }
}

export async function onRequestDelete(context: {
  params: { id: string }
  env: { DB: D1Database }
}) {
  const { id } = context.params
  const { DB } = context.env
  const postId = Number(id)

  if (!postId) {
    return error('Invalid post id')
  }

  try {
    const result = await DB.prepare('DELETE FROM posts WHERE id = ?')
      .bind(postId)
      .run()

    if (result.meta.changes === 0) {
      return error('Post not found', 404)
    }

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
