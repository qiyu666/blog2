// POST /api/auth/login
import { json, error } from '../_helpers'
import {
  verifyPassword,
  createSession,
  sessionCookie,
} from '../_auth'

export async function onRequestPost(context: {
  request: Request
  env: { DB: D1Database }
}) {
  const { request, env } = context
  let body: { identifier?: string; password?: string }
  try {
    body = await request.json()
  } catch {
    return error('请求体格式错误')
  }

  const identifier = (body.identifier || '').trim().toLowerCase()
  const password = body.password || ''

  if (!identifier || !password) {
    return error('请输入用户名/邮箱和密码')
  }

  // Allow login by username or email
  const user = await env.DB
    .prepare(
      'SELECT id, username, email, role, avatar, bio, created_at, password_hash, salt FROM users WHERE username = ? OR email = ?'
    )
    .bind(identifier, identifier)
    .first<{
      id: number
      username: string
      email: string
      role: string
      avatar: string
      bio: string
      created_at: string
      password_hash: string
      salt: string
    }>()

  if (!user) {
    return error('用户名或密码错误', 401)
  }

  const ok = await verifyPassword(password, user.salt, user.password_hash)
  if (!ok) {
    return error('用户名或密码错误', 401)
  }

  const token = await createSession(env.DB, user.id)
  const { password_hash, salt, ...safeUser } = user

  return json({ user: safeUser, token }, 200, {
    'Set-Cookie': sessionCookie(token),
  })
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
