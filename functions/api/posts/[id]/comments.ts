// /api/posts/[id]/comments
// GET  → list comments for a post
// POST → create a comment (requires login)

import { json, error } from '../../_helpers'
import { getSession, cleanText } from '../../_auth'
import { notify } from '../../_notifications'

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

  try {
    // likes_count 始终查询；liked 仅在登录时查询（当前用户是否点赞）
    const likedSubquery = user
      ? `, (SELECT COUNT(*) FROM comment_likes cl WHERE cl.comment_id = c.id AND cl.user_id = ?) AS liked`
      : ''
    const query = `SELECT c.id, c.post_id, c.user_id, c.parent_id, c.content, c.created_at,
        u.username AS author_username, u.avatar AS author_avatar,
        (SELECT COUNT(*) FROM comment_likes cl WHERE cl.comment_id = c.id) AS likes_count${likedSubquery}
       FROM comments c
       JOIN users u ON c.user_id = u.id
       WHERE c.post_id = ?
       ORDER BY c.created_at ASC`
    const stmt = user
      ? DB.prepare(query).bind(user.id, postId)
      : DB.prepare(query).bind(postId)
    const result = await stmt.all()
    const comments = (result.results as Array<Record<string, unknown>>).map(row => ({
      ...row,
      likes_count: row.likes_count ?? 0,
      liked: user ? !!row.liked : false,
    }))
    return json(comments)
  } catch (err) {
    if (String(err).includes('no such table')) return json([])
    return error('Failed to fetch comments', 500)
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

  let body: { content?: string; parent_id?: number | null }
  try {
    body = await request.json()
  } catch {
    return error('请求体格式错误')
  }

  const content = cleanText(body.content, 5000).trim()
  if (!content) return error('评论内容不能为空')

  const parentId = body.parent_id || null
  if (parentId !== null) {
    const parent = await env.DB
      .prepare('SELECT id FROM comments WHERE id = ? AND post_id = ?')
      .bind(parentId, postId)
      .first()
    if (!parent) return error('父评论不存在', 400)
  }

  try {
    const result = await env.DB
      .prepare(
        'INSERT INTO comments (post_id, user_id, parent_id, content) VALUES (?, ?, ?, ?)'
      )
      .bind(postId, user.id, parentId, content)
      .run()
    const commentId = result.meta.last_row_id as number
    const comment = await env.DB
      .prepare(
        `SELECT c.id, c.post_id, c.user_id, c.parent_id, c.content, c.created_at,
          u.username AS author_username, u.avatar AS author_avatar
         FROM comments c JOIN users u ON c.user_id = u.id
         WHERE c.id = ?`
      )
      .bind(commentId)
      .first()

    // ---- 通知 ----
    // 1. 通知帖子作者有人评论了他的帖子
    const postOwner = await env.DB
      .prepare('SELECT author_id FROM posts WHERE id = ?')
      .bind(postId)
      .first<{ author_id: number | null }>()
    if (postOwner?.author_id) {
      void notify({
        db: env.DB,
        userId: postOwner.author_id,
        actorId: user.id,
        type: 'post_comment',
        postId,
        commentId,
      })
    }
    // 2. 如果是回复，通知被回复者
    if (parentId) {
      const parent = await env.DB
        .prepare('SELECT user_id FROM comments WHERE id = ?')
        .bind(parentId)
        .first<{ user_id: number }>()
      if (parent?.user_id) {
        void notify({
          db: env.DB,
          userId: parent.user_id,
          actorId: user.id,
          type: 'comment_reply',
          postId,
          commentId,
        })
      }
    }

    // 3. 解析 @mentions 并通知被提及的用户
    const mentions = content.match(/@([a-zA-Z0-9_]{3,20})/g) || []
    const uniqueMentions = [...new Set(mentions.map(m => m.slice(1)))]
    for (const mentionedUsername of uniqueMentions) {
      if (mentionedUsername === user.username) continue
      const mentionedUser = await env.DB
        .prepare('SELECT id FROM users WHERE username = ?')
        .bind(mentionedUsername)
        .first<{ id: number }>()
      if (mentionedUser) {
        void notify({
          db: env.DB,
          userId: mentionedUser.id,
          actorId: user.id,
          type: 'system',
          postId,
          commentId,
        })
      }
    }

    return json(comment, 201)
  } catch (err) {
    return error('评论失败：' + String(err), 500)
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
