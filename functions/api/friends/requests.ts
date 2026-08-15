// GET /api/friends/requests → 获取所有好友请求
// POST /api/friends/requests → 发送好友请求
// POST /api/friends/requests/:id/accept → 接受请求
// POST /api/friends/requests/:id/reject → 拒绝请求
// DELETE /api/friends/requests/:id → 取消已发送的请求或解除好友关系

import { json, error } from '../_helpers'
import { getSession } from '../_auth'

export async function onRequestGet(context: {
  request: Request
  env: { DB: D1Database }
}) {
  const { request, env } = context
  const { user } = await getSession(request, env.DB)
  if (!user) return error('未登录', 401)

  // 待处理的 incoming 请求（别人发给我的）
  const incomingResult = await env.DB.prepare(
    `SELECT * FROM friend_requests WHERE to_user_id = ? AND status = 'pending' ORDER BY created_at DESC`
  ).bind(user.id)

  // 待处理的 outgoing 请求（我发给别人的）
  const pendingOutgoingResult = await env.DB.prepare(
    `SELECT * FROM friend_requests WHERE from_user_id = ? AND status = 'pending' ORDER BY created_at DESC`
  ).bind(user.id)

  // 已接受的好友关系（双方均为 accepted）
  const friendsResult = await env.DB.prepare(
    `SELECT * FROM friend_requests WHERE ((from_user_id = ? OR to_user_id = ?) AND status = 'accepted') ORDER BY created_at DESC`
  ).bind(user.id, user.id)

  return json({
    incoming: (incomingResult.results ?? []) as Array<Record<string, unknown>>,
    outgoing: (pendingOutgoingResult.results ?? []) as Array<Record<string, unknown>>,
    friends: (friendsResult.results ?? []) as Array<Record<string, unknown>>,
  })
}

export async function onRequestPost(context: {
  request: Request
  params: { id?: string }
  env: { DB: D1Database }
}) {
  const { request, params, env } = context
  const { id } = params
  const { user } = await getSession(request, env.DB)
  if (!user) return error('未登录', 401)

  if (!id) {
    // 发送好友请求
    const body = await request.json().catch(() => ({}))
    const to_user_id = Number(body.to_user_id)
    if (!to_user_id || to_user_id === user.id) {
      return error('参数无效', 400)
    }

    // 检查是否已经是好友（互相 accepted）
    const existingFriend = await env.DB.prepare(
      `SELECT 1 FROM friend_requests
       WHERE ((from_user_id = ? AND to_user_id = ?) OR (from_user_id = ? AND to_user_id = ?))
       AND status = 'accepted' LIMIT 1`
    ).bind(user.id, to_user_id, to_user_id, user.id).first()
    if (existingFriend) return error('你们已经是好友了', 400)

    // 检查是否已有 pending 请求（重复发送）
    const existingRequest = await env.DB.prepare(
      `SELECT id FROM friend_requests
       WHERE from_user_id = ? AND to_user_id = ? AND status = 'pending'`
    ).bind(user.id, to_user_id).first()
    if (existingRequest) return error('已发送好友请求，等待对方回复', 409)

    // 检查对方是否已经给自己发了 pending 请求 → 自动接受
    const reciprocalRequest = await env.DB.prepare(
      `SELECT id FROM friend_requests
       WHERE from_user_id = ? AND to_user_id = ? AND status = 'pending'`
    ).bind(to_user_id, user.id).first()
    if (reciprocalRequest) {
      // 对方也发了请求，自动双向接受
      await env.DB.prepare(
        `UPDATE friend_requests SET status = 'accepted', responded_at = datetime('now')
         WHERE id = ?`
      ).bind(reciprocalRequest.id).run()
      if (existingRequest) {
        await env.DB.prepare(
          `UPDATE friend_requests SET status = 'accepted', responded_at = datetime('now')
           WHERE id = ?`
        ).bind(existingRequest.id).run()
      }
      return json({ status: 'accepted', auto_accepted: true })
    }

    await env.DB.prepare(
      `INSERT INTO friend_requests (from_user_id, to_user_id, status) VALUES (?, ?, 'pending')`
    ).bind(user.id, to_user_id).run()

    return json({ status: 'pending' }, 201)
  }

  // 处理请求（接受 / 拒绝 / 取消）
  const requestId = Number(id)
  const req = await env.DB.prepare('SELECT * FROM friend_requests WHERE id = ?').bind(requestId).first()
  if (!req) return error('请求不存在', 404)

  const { action } = await request.json().catch(() => ({}))

  if (action === 'accept') {
    if (Number(req.to_user_id) !== user.id) return error('无权操作', 403)
    if (req.status !== 'pending') return error('请求已处理', 400)
    await env.DB.prepare(
      `UPDATE friend_requests SET status = 'accepted', responded_at = datetime('now') WHERE id = ?`
    ).bind(requestId).run()
    return json({ status: 'accepted' })
  }

  if (action === 'reject') {
    if (Number(req.to_user_id) !== user.id) return error('无权操作', 403)
    if (req.status !== 'pending') return error('请求已处理', 400)
    await env.DB.prepare(
      `UPDATE friend_requests SET status = 'rejected', responded_at = datetime('now') WHERE id = ?`
    ).bind(requestId).run()
    return json({ status: 'rejected' })
  }

  if (action === 'cancel') {
    if (Number(req.from_user_id) !== user.id) return error('无权操作', 403)
    if (req.status !== 'pending') return error('无法取消', 400)
    await env.DB.prepare(
      `DELETE FROM friend_requests WHERE id = ?`
    ).bind(requestId).run()
    return json({ deleted: true })
  }

  if (action === 'unfriend') {
    // 解除好友关系：将 accepted 记录标记为 cancelled
    if (Number(req.from_user_id) !== user.id && Number(req.to_user_id) !== user.id) {
      return error('无权操作', 403)
    }
    await env.DB.prepare(
      `UPDATE friend_requests SET status = 'cancelled', responded_at = datetime('now') WHERE id = ?`
    ).bind(requestId).run()
    return json({ status: 'cancelled' })
  }

  return error('无效操作', 400)
}

export async function onRequestDelete(context: {
  request: Request
  params: { id: string }
  env: { DB: D1Database }
}) {
  const { request, params, env } = context
  const { id } = params
  const rateCheck = await enforceAdminRateLimit(request)
  if (rateCheck) return rateCheck

  const { user } = await getSession(request, env.DB)
  if (!user) return error('未登录', 401)

  const requestId = Number(id)
  const req = await env.DB.prepare('SELECT * FROM friend_requests WHERE id = ?').bind(requestId).first()
  if (!req) return error('请求不存在', 404)

  // 取消已发送的请求 或 解除好友关系
  if (Number(req.from_user_id) === user.id && req.status === 'pending') {
    await env.DB.prepare(`DELETE FROM friend_requests WHERE id = ?`).bind(requestId).run()
    return json({ deleted: true })
  }

  // 解除好友关系（标记为 cancelled）
  if ((Number(req.from_user_id) === user.id || Number(req.to_user_id) === user.id) && req.status === 'accepted') {
    await env.DB.prepare(
      `UPDATE friend_requests SET status = 'cancelled', responded_at = datetime('now') WHERE id = ?`
    ).bind(requestId).run()
    return json({ status: 'cancelled' })
  }

  return error('无权操作', 403)
}
