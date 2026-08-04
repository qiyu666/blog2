// /api/favorites/[id]
// PATCH → 把某条收藏移动到指定 collection（collection_id=null 表示默认收藏）
//         body: { collection_id: number | null }

import { json, error } from '../_helpers'
import { getSession } from '../_auth'

async function ensureCollectionsSchema(db: D1Database): Promise<void> {
  try {
    await db.prepare('ALTER TABLE favorites ADD COLUMN collection_id INTEGER').run()
  } catch {
    // 列已存在
  }
}

export async function onRequestPatch(context: {
  request: Request
  params: { id: string }
  env: { DB: D1Database }
}) {
  const { request, params, env } = context
  const favoriteId = Number(params.id)
  if (!favoriteId) return error('无效的收藏 id')

  const { user } = await getSession(request, env.DB)
  if (!user) return error('请先登录', 401)

  await ensureCollectionsSchema(env.DB)

  // 校验这条收藏属于当前用户
  const fav = await env.DB
    .prepare('SELECT id FROM favorites WHERE id = ? AND user_id = ?')
    .bind(favoriteId, user.id)
    .first()
  if (!fav) return error('收藏不存在', 404)

  let body: { collection_id?: number | null }
  try {
    body = await request.json()
  } catch {
    return error('请求体格式错误')
  }

  const targetId = body.collection_id === null || body.collection_id === undefined
    ? null
    : Number(body.collection_id)

  // 若指定了 collection，校验它属于当前用户
  if (targetId !== null) {
    if (!Number.isFinite(targetId) || targetId <= 0) {
      return error('无效的收藏夹 id')
    }
    const col = await env.DB
      .prepare('SELECT id FROM favorite_collections WHERE id = ? AND user_id = ?')
      .bind(targetId, user.id)
      .first()
    if (!col) return error('收藏夹不存在', 404)
  }

  try {
    await env.DB
      .prepare('UPDATE favorites SET collection_id = ? WHERE id = ? AND user_id = ?')
      .bind(targetId, favoriteId, user.id)
      .run()
    return json({ success: true, collection_id: targetId })
  } catch (err) {
    return error('移动收藏失败：' + String(err), 500)
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'PATCH, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
