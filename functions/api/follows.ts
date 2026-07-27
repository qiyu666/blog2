// /api/follows
// GET    → ?username=xxx  返回该用户的关注/粉丝数 + 当前用户是否关注
// POST   → 关注/取关  { username: string }
// DELETE → 取关  ?username=xxx

import { json, error } from './_helpers'
import { getSession } from './_auth'
import { notify } from './_notifications'

export async function onRequestGet(context: {
  request: Request
  env: { DB: D1Database }
}) {
  const { request, env } = context
  const url = new URL(request.url)
  const username = (url.searchParams.get('username') || '').trim()
  if (!username) return error('缺少 username 参数')

  const target = await env.DB
    .prepare('SELECT id FROM users WHERE username = ?')
    .bind(username)
    .first<{ id: number }>()
  if (!target) return error('用户不存在', 404)

  const { user } = await getSession(request, env.DB)

  const [following, followers] = await Promise.all([
    env.DB
      .prepare('SELECT COUNT(*) AS c FROM follows WHERE follower_id = ?')
      .bind(target.id)
      .first<{ c: number }>(),
    env.DB
      .prepare('SELECT COUNT(*) AS c FROM follows WHERE following_id = ?')
      .bind(target.id)
      .first<{ c: number }>(),
  ])

  let isFollowing = false
  if (user && user.id !== target.id) {
    const row = await env.DB
      .prepare('SELECT id FROM follows WHERE follower_id = ? AND following_id = ?')
      .bind(user.id, target.id)
      .first()
    isFollowing = !!row
  }

  return json({
    following: following?.c || 0,
    followers: followers?.c || 0,
    is_following: isFollowing,
  })
}

export async function onRequestPost(context: {
  request: Request
  env: { DB: D1Database }
}) {
  const { request, env } = context
  const { user } = await getSession(request, env.DB)
  if (!user) return error('请先登录', 401)

  let body: { username?: string }
  try {
    body = await request.json()
  } catch {
    return error('请求体格式错误')
  }

  const username = (body.username || '').trim()
  if (!username) return error('缺少 username')

  const target = await env.DB
    .prepare('SELECT id FROM users WHERE username = ?')
    .bind(username)
    .first<{ id: number }>()
  if (!target) return error('用户不存在', 404)
  if (target.id === user.id) return error('不能关注自己', 400)

  const existing = await env.DB
    .prepare('SELECT id FROM follows WHERE follower_id = ? AND following_id = ?')
    .bind(user.id, target.id)
    .first()

  try {
    if (existing) {
      // toggle off
      await env.DB
        .prepare('DELETE FROM follows WHERE follower_id = ? AND following_id = ?')
        .bind(user.id, target.id)
        .run()
      return json({ following: false })
    }
    // toggle on
    await env.DB
      .prepare('INSERT INTO follows (follower_id, following_id) VALUES (?, ?)')
      .bind(user.id, target.id)
      .run()
    void notify({
      db: env.DB,
      userId: target.id,
      actorId: user.id,
      type: 'follow',
    })
    return json({ following: true }, 201)
  } catch (err) {
    return error('操作失败：' + String(err), 500)
  }
}

export async function onRequestDelete(context: {
  request: Request
  env: { DB: D1Database }
}) {
  const { request, env } = context
  const { user } = await getSession(request, env.DB)
  if (!user) return error('请先登录', 401)

  const url = new URL(request.url)
  const username = (url.searchParams.get('username') || '').trim()
  if (!username) return error('缺少 username')

  const target = await env.DB
    .prepare('SELECT id FROM users WHERE username = ?')
    .bind(username)
    .first<{ id: number }>()
  if (!target) return error('用户不存在', 404)

  await env.DB
    .prepare('DELETE FROM follows WHERE follower_id = ? AND following_id = ?')
    .bind(user.id, target.id)
    .run()
  return json({ following: false })
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
