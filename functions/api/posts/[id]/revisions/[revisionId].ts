// /api/posts/[id]/revisions/[revisionId]
// GET  → 获取某条修订的完整内容（作者或管理员）
// POST → 恢复某条修订：先把当前文章状态保存为新修订，再用旧修订内容覆盖文章

import { json, error, slugify, uniqueSlug } from '../../../_helpers'
import { getSession } from '../../../_auth'

/** post_revisions 表的建表语句，所有需要写入/读取该表的入口都应先调用此函数。 */
async function ensureRevisionsTable(db: D1Database): Promise<void> {
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

/** 写入一条修订，并清理超出 50 条上限的旧修订。 */
async function insertRevision(
  db: D1Database,
  postId: number,
  fields: {
    title: string
    content: string
    excerpt: string
    category: string
    tags: string
    cover_image: string
    custom_js: string
    author_id: number | null
  }
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO post_revisions
        (post_id, title, content, excerpt, category, tags, cover_image, custom_js, author_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      postId,
      fields.title,
      fields.content,
      fields.excerpt,
      fields.category,
      fields.tags,
      fields.cover_image,
      fields.custom_js,
      fields.author_id
    )
    .run()

  // 仅保留最近 50 条修订
  await db
    .prepare(
      `DELETE FROM post_revisions
       WHERE post_id = ?
         AND id NOT IN (
           SELECT id FROM post_revisions
           WHERE post_id = ?
           ORDER BY created_at DESC, id DESC
           LIMIT 50
         )`
    )
    .bind(postId, postId)
    .run()
}

export async function onRequestGet(context: {
  request: Request
  params: { id: string; revisionId: string }
  env: { DB: D1Database }
}) {
  const { request, params, env } = context
  const { DB } = env

  const postId = await resolvePostId(DB, params.id)
  if (!postId) return error('Post not found', 404)

  const revisionId = Number(params.revisionId)
  if (!revisionId) return error('Invalid revision id')

  const { user } = await getSession(request, DB)
  if (!user) return error('请先登录', 401)

  const post = await DB.prepare('SELECT author_id FROM posts WHERE id = ?')
    .bind(postId)
    .first<{ author_id: number | null }>()
  if (!post) return error('Post not found', 404)

  if (post.author_id !== user.id && user.role !== 'admin') {
    return error('无权查看历史版本', 403)
  }

  try {
    await ensureRevisionsTable(DB)
    const revision = await DB.prepare(
      `SELECT r.id, r.post_id, r.title, r.content, r.excerpt, r.category,
          r.tags, r.cover_image, r.custom_js, r.author_id, r.created_at,
          u.username AS author_username
       FROM post_revisions r
       LEFT JOIN users u ON r.author_id = u.id
       WHERE r.id = ? AND r.post_id = ?`
    )
      .bind(revisionId, postId)
      .first()

    if (!revision) return error('修订不存在', 404)
    return json(revision)
  } catch (err) {
    if (String(err).includes('no such table')) return error('修订不存在', 404)
    return error('Failed to fetch revision: ' + String(err), 500)
  }
}

export async function onRequestPost(context: {
  request: Request
  params: { id: string; revisionId: string }
  env: { DB: D1Database }
}) {
  const { request, params, env } = context
  const { DB } = env

  const postId = await resolvePostId(DB, params.id)
  if (!postId) return error('Post not found', 404)

  const revisionId = Number(params.revisionId)
  if (!revisionId) return error('Invalid revision id')

  const { user } = await getSession(request, DB)
  if (!user) return error('请先登录', 401)

  const existing = await DB.prepare(
    'SELECT id, author_id, title, slug, excerpt, content, category, tags, cover_image, custom_js, is_pinned, is_featured, published FROM posts WHERE id = ?'
  )
    .bind(postId)
    .first<{
      id: number
      author_id: number | null
      title: string
      slug: string
      excerpt: string
      content: string
      category: string
      tags: string
      cover_image: string
      custom_js: string
      is_pinned: number
      is_featured: number
      published: number
    }>()
  if (!existing) return error('Post not found', 404)

  if (existing.author_id !== user.id && user.role !== 'admin') {
    return error('无权恢复历史版本', 403)
  }

  try {
    await ensureRevisionsTable(DB)

    const revision = await DB.prepare(
      `SELECT id, title, content, excerpt, category, tags, cover_image, custom_js, author_id
       FROM post_revisions WHERE id = ? AND post_id = ?`
    )
      .bind(revisionId, postId)
      .first<{
        id: number
        title: string
        content: string
        excerpt: string
        category: string
        tags: string
        cover_image: string
        custom_js: string
        author_id: number | null
      }>()

    if (!revision) return error('修订不存在', 404)

    // 1. 把当前文章状态保存为新修订（恢复前的快照）
    await insertRevision(DB, postId, {
      title: existing.title,
      content: existing.content,
      excerpt: existing.excerpt,
      category: existing.category,
      tags: existing.tags,
      cover_image: existing.cover_image,
      custom_js: existing.custom_js,
      author_id: user.id,
    })

    // 2. 如果标题变化，重新生成 slug
    const newSlug = revision.title !== existing.title
      ? await uniqueSlug(DB, slugify(revision.title), postId)
      : existing.slug

    // 3. 用旧修订内容更新文章（保留 is_pinned / is_featured / published）
    await DB.prepare(
      `UPDATE posts SET
        title = ?, slug = ?, excerpt = ?, content = ?,
        category = ?, tags = ?, cover_image = ?, custom_js = ?,
        updated_at = datetime('now')
       WHERE id = ?`
    )
      .bind(
        revision.title,
        newSlug,
        revision.excerpt,
        revision.content,
        revision.category,
        revision.tags,
        revision.cover_image,
        revision.custom_js,
        postId
      )
      .run()

    return json({ success: true, post_id: postId, revision_id: revisionId })
  } catch (err) {
    return error('Failed to restore revision: ' + String(err), 500)
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
