// /api/posts/[id]/revisions
// GET → list all revisions for a post (author or admin only)
//
// 数据表 post_revisions 在首次访问时自动创建（CREATE TABLE IF NOT EXISTS）。
// 每篇文章最多保留最近 50 条修订，超出部分由写入路径自动清理。

import { json, error } from '../../_helpers'
import { getSession } from '../../_auth'

/** post_revisions 表的建表语句，所有需要写入/读取该表的入口都应先调用此函数。 */
export async function ensureRevisionsTable(db: D1Database): Promise<void> {
  await db
    .prepare(
      `CREATE TABLE IF NOT EXISTS post_revisions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        post_id INTEGER NOT NULL,
        title TEXT NOT NULL DEFAULT '',
        content TEXT NOT NULL DEFAULT '',
        excerpt TEXT NOT NULL DEFAULT '',
        category TEXT NOT NULL DEFAULT '',
        tags TEXT NOT NULL DEFAULT '',
        cover_image TEXT NOT NULL DEFAULT '',
        custom_js TEXT NOT NULL DEFAULT '',
        author_id INTEGER,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`
    )
    .run()
  await db
    .prepare(
      'CREATE INDEX IF NOT EXISTS idx_post_revisions_post_created ON post_revisions(post_id, created_at DESC)'
    )
    .run()
}

async function resolvePostId(db: D1Database, idParam: string): Promise<number | null> {
  const isNum = /^\d+$/.test(idParam)
  if (isNum) {
    const row = await db
      .prepare('SELECT id FROM posts WHERE id = ?')
      .bind(Number(idParam))
      .first<{ id: number }>()
    if (row) return row.id
  }
  const row = await db
    .prepare('SELECT id FROM posts WHERE slug = ?')
    .bind(idParam)
    .first<{ id: number }>()
  return row?.id ?? null
}

export async function onRequestGet(context: {
  request: Request
  params: { id: string }
  env: { DB: D1Database }
}) {
  const { request, params, env } = context
  const { DB } = env

  const postId = await resolvePostId(DB, params.id)
  if (!postId) return error('Post not found', 404)

  const { user } = await getSession(request, DB)
  if (!user) return error('请先登录', 401)

  // 取文章作者用于权限校验
  const post = await DB.prepare('SELECT author_id FROM posts WHERE id = ?')
    .bind(postId)
    .first<{ author_id: number | null }>()
  if (!post) return error('Post not found', 404)

  const isAuthor = post.author_id === user.id
  const isAdmin = user.role === 'admin'
  if (!isAuthor && !isAdmin) {
    return error('无权查看历史版本', 403)
  }

  try {
    await ensureRevisionsTable(DB)
    const result = await DB.prepare(
      `SELECT r.id, r.created_at, r.author_id, r.title, r.content,
          u.username AS author_username
       FROM post_revisions r
       LEFT JOIN users u ON r.author_id = u.id
       WHERE r.post_id = ?
       ORDER BY r.created_at DESC, r.id DESC`
    )
      .bind(postId)
      .all()

    const rows = (result.results as Array<Record<string, unknown>>).map((row) => {
      const title = String(row.title ?? '')
      const content = String(row.content ?? '')
      const titleExcerpt = title.length > 60 ? title.slice(0, 60) + '…' : title
      return {
        id: row.id,
        created_at: row.created_at,
        author_id: row.author_id,
        author_username: row.author_username ?? null,
        title,
        title_excerpt: titleExcerpt,
        content_length: content.length,
      }
    })

    return json(rows)
  } catch (err) {
    if (String(err).includes('no such table')) return json([])
    return error('Failed to fetch revisions: ' + String(err), 500)
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
