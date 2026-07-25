// /api/posts/[id]/favorites
// POST   → toggle favorite (requires login)
// DELETE → remove favorite (requires login)

import { json, error } from '../../_helpers'
import { getSession } from '../../_auth'

async function resolvePostId(db: D1Database, idParam: string): Promise<number | null> {
  const isNum = /^\d+$/.test(idParam)
  const row = isNum
    ? await db.prepare('SELECT id FROM posts WHERE id = ?').bind(idParam).first<{ id: number }>()
    : await db.prepare('SELECT id FROM posts WHERE slug = ?').bind(idParam).first<{ id: number }>()
  return row?.id ?? null
}

export async function onRequestPost(context: {
  request: Request
  params: { id: string }
  env: { DB: D1Database }
}) {
  const { request, params, env } = context
  const { user } = await getSession(request, env.DB)
  if (!user) return error('请先登录', 401)

  const postId = await resolvePostId(env.DB, params.id)
  if (!postId) return error('Post not found', 404)

  const existing = await env.DB
    .prepare('SELECT id FROM favorites WHERE post_id = ? AND user_id = ?')
    .bind(postId, user.id)
    .first()

  try {
    if (existing) {
      await env.DB.prepare('DELETE FROM favorites WHERE post_id = ? AND user_id = ?')
        .bind(postId, user.id)
        .run()
      return json({ favorited: false, action: 'unfavorited' })
    } else {
      await env.DB.prepare('INSERT INTO favorites (post_id, user_id) VALUES (?, ?)')
        .bind(postId, user.id)
        .run()
      return json({ favorited: true, action: 'favorited' }, 201)
    }
  } catch (err) {
    return error('操作失败：' + String(err), 500)
  }
}

export async function onRequestDelete(context: {
  request: Request
  params: { id: string }
  env: { DB: D1Database }
}) {
  const { request, params, env } = context
  const { user } = await getSession(request, env.DB)
  if (!user) return error('请先登录', 401)

  const postId = await resolvePostId(env.DB, params.id)
  if (!postId) return error('Post not found', 404)

  await env.DB.prepare('DELETE FROM favorites WHERE post_id = ? AND user_id = ?')
    .bind(postId, user.id)
    .run()
  return json({ favorited: false })
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
