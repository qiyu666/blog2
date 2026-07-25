// GET /api/posts     → list all posts (newest first)
// POST /api/posts    → create a new post

import { json, error, slugify, uniqueSlug } from './_helpers'

interface PostInput {
  title: string
  excerpt: string
  content: string
  author: string
  category: string
  tags: string
  cover_image: string
}

export async function onRequestGet(context: { env: { DB: D1Database } }) {
  const { DB } = context.env
  try {
    const result = await DB.prepare(
      'SELECT * FROM posts WHERE published = 1 ORDER BY created_at DESC'
    ).all()
    return json(result.results)
  } catch (err) {
    // If the database isn't set up yet, return empty array
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

  const slug = await uniqueSlug(env.DB, slugify(title))

  try {
    const result = await env.DB.prepare(
      `INSERT INTO posts (title, slug, excerpt, content, author, category, tags, cover_image)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        title.trim(),
        slug,
        (excerpt || '').trim() || content.slice(0, 150) + '...',
        content,
        (author || 'Anonymous').trim(),
        (category || 'General').trim(),
        (tags || '').trim(),
        (cover_image || '').trim()
      )
      .run()

    const post = await env.DB.prepare('SELECT * FROM posts WHERE id = ?')
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
