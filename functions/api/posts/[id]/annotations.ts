// /api/posts/[id]/annotations
// GET  → list annotations for a post (public reads approved only; admin/author sees all)
// POST → create an annotation (requires login)

import { json, error } from '../../_helpers'
import { getSession, cleanText } from '../../_auth'

async function resolvePostId(db: D1Database, idParam: string): Promise<number | null> {
  const isNum = /^\d+$/.test(idParam)
  if (isNum) {
    const row = await db.prepare('SELECT id FROM posts WHERE id = ?').bind(Number(idParam)).first<{ id: number }>()
    if (row) return row.id
  }
  const row = await db.prepare('SELECT id FROM posts WHERE slug = ?').bind(idParam).first<{ id: number }>()
  return row?.id ?? null
}

export async function onRequestGet(context: {
  request: Request
  params: { id: string }
  env: { DB: D1Database }
}) {
  const { request, id } = { request: context.request, id: context.params.id }
  const { DB } = context.env

  const postId = await resolvePostId(DB, id)
  if (!postId) return error('Post not found', 404)

  const { user } = await getSession(request, DB)
  let canSeeAll = false
  if (user) {
    if (user.role === 'admin') {
      canSeeAll = true
    } else {
      const post = await DB.prepare('SELECT author_id FROM posts WHERE id = ?').bind(postId).first<{ author_id: number | null }>()
      if (post?.author_id === user.id) canSeeAll = true
    }
  }

  try {
    const statusClause = canSeeAll ? '' : "AND a.status = 'approved'"
    const query = `
      SELECT a.id, a.post_id, a.user_id, a.parent_id, a.element_hash, a.element_index,
             a.element_type, a.element_text, a.content, a.created_at,
             u.username AS author_username, u.avatar AS author_avatar,
             (SELECT COUNT(*) FROM annotations c WHERE c.parent_id = a.id) AS reply_count
      FROM annotations a
      JOIN users u ON a.user_id = u.id
      WHERE a.post_id = ? ${statusClause}
        AND a.parent_id IS NULL
      ORDER BY a.created_at ASC
    `
    const result = await (user ? DB.prepare(query).bind(postId, user.id) : DB.prepare(query).bind(postId)).all()
    const annotations = (result.results as Array<Record<string, unknown>>).map(row => ({
      ...row,
      reply_count: row.reply_count ?? 0,
    }))
    return json(annotations)
  } catch (err) {
    if (String(err).includes('no such table')) return json([])
    return error('Failed to fetch annotations', 500)
  }
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

  let body: {
    element_hash?: string
    element_index?: number
    element_type?: string
    element_text?: string
    content?: string
    parent_id?: number | null
  }
  try {
    body = await request.json()
  } catch {
    return error('请求体格式错误')
  }

  const content = cleanText(body.content, 5000).trim()
  if (!content) return error('标注内容不能为空')

  const elementHash = cleanText(body.element_hash || '', 64).trim()
  const elementIndex = typeof body.element_index === 'number' ? body.element_index : 0
  const elementType = (body.element_type === 'h1' || body.element_type === 'h2' || body.element_type === 'h3' || body.element_type === 'h4' || body.element_type === 'h5')
    ? body.element_type
    : 'p'
  const elementText = cleanText(body.element_text || '', 500).trim()
  const parentId = body.parent_id || null

  if (parentId !== null) {
    const parent = await env.DB
      .prepare('SELECT id FROM annotations WHERE id = ? AND post_id = ?')
      .bind(parentId, postId)
      .first()
    if (!parent) return error('父标注不存在', 400)
  }

  try {
    const result = await env.DB
      .prepare(
        `INSERT INTO annotations (post_id, user_id, element_hash, element_index, element_type, element_text, content, parent_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(postId, user.id, elementHash, elementIndex, elementType, elementText, content, parentId)
      .run()

    const annotationId = result.meta.last_row_id as number

    const annotation = await env.DB
      .prepare(
        `SELECT a.id, a.post_id, a.user_id, a.parent_id, a.element_hash, a.element_index,
                a.element_type, a.element_text, a.content, a.created_at,
                u.username AS author_username, u.avatar AS author_avatar,
                (SELECT COUNT(*) FROM annotations c WHERE c.parent_id = a.id) AS reply_count
         FROM annotations a JOIN users u ON a.user_id = u.id WHERE a.id = ?`
      )
      .bind(annotationId)
      .first()

    if (!annotation) return error('创建标注失败', 500)

    return json(annotation, 201)
  } catch (err) {
    return error('标注失败：' + String(err), 500)
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
