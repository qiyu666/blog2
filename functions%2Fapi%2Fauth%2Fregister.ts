// POST /api/auth/register
import { json, error } from '../_helpers'
import {
  hashPassword,
  randomHex,
  createSession,
  sessionCookie,
  validateUsername,
  validateEmail,
  validatePassword,
} from '../_auth'

export async function onRequestPost(context: {
  request: Request
  env: { DB: D1Database }
}) {
  const { request, env } = context
  let body: { username?: string; email?: string; password?: string }
  try {
    body = await request.json()
  } catch {
    return error('请求体格式错误')
  }

  const username = (body.username || '').trim()
  const email = (body.email || '').trim().toLowerCase()
  const password = body.password || ''

  const ue = validateUsername(username)
  if (ue) return error(ue)
  const ee = validateEmail(email)
  if (ee) return error(ee)
  const pe = validatePassword(password)
  if (pe) return error(pe)

  // Check uniqueness
  const existing = await env.DB
    .prepare('SELECT id FROM users WHERE username = ? OR email = ?')
    .bind(username, email)
    .first()
  if (existing) {
    return error('用户名或邮箱已被注册', 409)
  }

  const salt = randomHex(16)
  const passwordHash = await hashPassword(password, salt)

  try {
    const result = await env.DB
      .prepare(
        'INSERT INTO users (username, email, password_hash, salt) VALUES (?, ?, ?, ?)'
      )
      .bind(username, email, passwordHash, salt)
      .run()
    const userId = result.meta.last_row_id as number

    const token = await createSession(env.DB, userId)
    const user = await env.DB
      .prepare('SELECT id, username, email, role, avatar, bio, created_at FROM users WHERE id = ?')
      .bind(userId)
      .first()

    return json({ user, token }, 201, {
      'Set-Cookie': sessionCookie(token),
    })
  } catch (err) {
    return error('注册失败：' + String(err), 500)
  }
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
