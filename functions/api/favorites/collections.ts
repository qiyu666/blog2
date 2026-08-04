// /api/favorites/collections
// GET    → 列出当前用户的收藏夹（id, name, count），含"默认收藏"
// POST   → 新建收藏夹 { name }
// PATCH  ?id=N → 重命名收藏夹 { name }
// DELETE ?id=N → 删除收藏夹，夹内收藏移回"默认收藏"（collection_id = NULL）

import { json, error } from '../_helpers'
import { getSession, cleanText } from '../_auth'

/** 自动建表：favorite_collections，并给 favorites 加 collection_id 列 */
async function ensureCollectionsSchema(db: D1Database): Promise<void> {
  await db
    .prepare(
      `CREATE TABLE IF NOT EXISTS favorite_collections (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )`
    )
    .run()
  await db
    .prepare('CREATE INDEX IF NOT EXISTS idx_fav_collections_user ON favorite_collections(user_id)')
    .run()

  // 给 favorites 表加 collection_id 列（SQLite 不支持 IF NOT EXISTS，用 try/catch 容错）
  try {
    await db.prepare('ALTER TABLE favorites ADD COLUMN collection_id INTEGER').run()
  } catch {
    // 列已存在，忽略
  }
  try {
    await db
      .prepare('CREATE INDEX IF NOT EXISTS idx_favorites_user_collection ON favorites(user_id, collection_id)')
      .run()
  } catch {
    // 索引已存在或 favorites 表缺失
  }
}

export async function onRequestGet(context: {
  request: Request
  env: { DB: D1Database }
}) {
  const { request, env } = context
  const { user } = await getSession(request, env.DB)
  if (!user) return error('请先登录', 401)

  await ensureCollectionsSchema(env.DB)

  try {
    // 默认收藏数（collection_id IS NULL）
    const defaultRow = await env.DB
      .prepare('SELECT COUNT(*) AS count FROM favorites WHERE user_id = ? AND collection_id IS NULL')
      .bind(user.id)
      .first<{ count: number }>()

    const cols = await env.DB
      .prepare(
        `SELECT c.id, c.name,
          (SELECT COUNT(*) FROM favorites f WHERE f.user_id = c.user_id AND f.collection_id = c.id) AS count
         FROM favorite_collections c
         WHERE c.user_id = ?
         ORDER BY c.created_at ASC, c.id ASC`
      )
      .bind(user.id)
      .all<{ id: number; name: string; count: number }>()

    return json({
      default: { id: 0, name: '默认收藏', count: defaultRow?.count ?? 0 },
      collections: cols.results || [],
    })
  } catch (err) {
    return error('获取收藏夹失败：' + String(err), 500)
  }
}

export async function onRequestPost(context: {
  request: Request
  env: { DB: D1Database }
}) {
  const { request, env } = context
  const { user } = await getSession(request, env.DB)
  if (!user) return error('请先登录', 401)

  let body: { name?: string }
  try {
    body = await request.json()
  } catch {
    return error('请求体格式错误')
  }

  const name = cleanText(body.name || '', 50).trim()
  if (!name) return error('收藏夹名称不能为空')

  await ensureCollectionsSchema(env.DB)

  try {
    const result = await env.DB
      .prepare('INSERT INTO favorite_collections (user_id, name) VALUES (?, ?)')
      .bind(user.id, name)
      .run()
    return json({
      id: result.meta?.last_row_id ?? null,
      name,
      count: 0,
    }, 201)
  } catch (err) {
    return error('创建收藏夹失败：' + String(err), 500)
  }
}

export async function onRequestPatch(context: {
  request: Request
  params: Record<string, string>
  env: { DB: D1Database }
}) {
  const { request, env } = context
  const url = new URL(request.url)
  const id = Number(url.searchParams.get('id'))
  if (!id) return error('缺少 id 参数')

  const { user } = await getSession(request, env.DB)
  if (!user) return error('请先登录', 401)

  let body: { name?: string }
  try {
    body = await request.json()
  } catch {
    return error('请求体格式错误')
  }

  const name = cleanText(body.name || '', 50).trim()
  if (!name) return error('收藏夹名称不能为空')

  await ensureCollectionsSchema(env.DB)

  const existing = await env.DB
    .prepare('SELECT id FROM favorite_collections WHERE id = ? AND user_id = ?')
    .bind(id, user.id)
    .first()
  if (!existing) return error('收藏夹不存在', 404)

  await env.DB
    .prepare('UPDATE favorite_collections SET name = ? WHERE id = ? AND user_id = ?')
    .bind(name, id, user.id)
    .run()

  return json({ id, name, success: true })
}

export async function onRequestDelete(context: {
  request: Request
  env: { DB: D1Database }
}) {
  const { request, env } = context
  const url = new URL(request.url)
  const id = Number(url.searchParams.get('id'))
  if (!id) return error('缺少 id 参数')

  const { user } = await getSession(request, env.DB)
  if (!user) return error('请先登录', 401)

  await ensureCollectionsSchema(env.DB)

  const existing = await env.DB
    .prepare('SELECT id FROM favorite_collections WHERE id = ? AND user_id = ?')
    .bind(id, user.id)
    .first()
  if (!existing) return error('收藏夹不存在', 404)

  // 把夹内收藏移回默认收藏（collection_id = NULL），再删除收藏夹
  await env.DB
    .prepare('UPDATE favorites SET collection_id = NULL WHERE collection_id = ? AND user_id = ?')
    .bind(id, user.id)
    .run()
  await env.DB
    .prepare('DELETE FROM favorite_collections WHERE id = ? AND user_id = ?')
    .bind(id, user.id)
    .run()

  return json({ success: true })
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
