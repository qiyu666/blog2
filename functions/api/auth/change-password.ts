import { json, error } from '../_helpers'
import { getSession, hashPassword, verifyPassword, randomHex } from '../_auth'

export async function onRequestPost(context: {
  request: Request
  env: { DB: D1Database }
}) {
  const { request, env } = context
  const { user } = await getSession(request, env.DB)
  if (!user) return error('请先登录', 401)

  let body: { newPassword?: string; oldPassword?: string }
  try {
    body = await request.json()
  } catch {
    return error('请求体格式错误')
  }

  const newPassword = body.newPassword?.trim()
  if (!newPassword || newPassword.length < 8) {
    return error('新密码至少需要 8 个字符')
  }

  const current = await env.DB
    .prepare('SELECT password_hash, salt FROM users WHERE id = ?')
    .bind(user.id)
    .first<{ password_hash: string; salt: string }>()

  if (!current) return error('用户不存在', 404)

  const hasPassword = current.password_hash && current.password_hash.length > 0

  if (hasPassword) {
    const oldPassword = body.oldPassword?.trim()
    if (!oldPassword) {
      return error('请输入当前密码')
    }
    const valid = await verifyPassword(oldPassword, current.password_hash, current.salt)
    if (!valid) {
      return error('当前密码不正确')
    }
  }

  const salt = randomHex(16)
  const passwordHash = await hashPassword(newPassword, salt)

  await env.DB
    .prepare('UPDATE users SET password_hash = ?, salt = ? WHERE id = ?')
    .bind(passwordHash, salt, user.id)
    .run()

  return json({ success: true })
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
