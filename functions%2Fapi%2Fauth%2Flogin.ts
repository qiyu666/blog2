// POST /api/auth/login
//
// 两步验证流程（无状态）：
//   1. 客户端 POST { identifier, password }
//      若该账户开启了 2FA，返回 { requires_2fa: true, twofa_token }
//      twofa_token 是用该 user 的 totp_secret 签名的 HMAC，里面包含 username + 过期时间
//   2. 客户端 POST { twofa_token, code }
//      服务端用 user.totp_secret 验签 → 验证 TOTP code → 创建 session

import { json, error } from '../_helpers'
import {
  verifyPassword,
  createSession,
  sessionCookie,
} from '../_auth'
import {
  checkLoginRateLimit,
  recordLoginAttempt,
  clearLoginFailures,
  pruneLoginAttempts,
} from '../_rate-limit'
import { verifyTotp } from '../_totp'

const TWofa_TTL_MS = 5 * 60 * 1000 // 5 分钟内完成 2FA

const encoder = new TextEncoder()

async function hmacSha1Hex(key: string, message: string): Promise<string> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(key) as BufferSource,
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign']
  )
  const mac = await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(message) as BufferSource)
  return Array.from(new Uint8Array(mac)).map(b => b.toString(16).padStart(2, '0')).join('')
}

function base64UrlEncode(s: string): string {
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function base64UrlDecode(s: string): string {
  const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4))
  return atob(s.replace(/-/g, '+').replace(/_/g, '/') + pad)
}

async function issue2faToken(username: string, totpSecret: string): Promise<string> {
  const expiresAt = Date.now() + TWofa_TTL_MS
  const payload = `${username}.${expiresAt}`
  const mac = await hmacSha1Hex(totpSecret, payload)
  return base64UrlEncode(`${payload}.${mac}`)
}

async function verify2faToken(
  db: D1Database,
  token: string
): Promise<{ user: { id: number; username: string; totp_secret: string; totp_enabled: number }; ok: boolean; reason?: string }> {
  let raw: string
  try {
    raw = base64UrlDecode(token)
  } catch {
    return { ok: false, reason: '2FA token 格式错误' }
  }
  const parts = raw.split('.')
  if (parts.length !== 3) return { ok: false, reason: '2FA token 格式错误' }
  const [username, expiresAtStr, mac] = parts
  const expiresAt = Number(expiresAtStr)
  if (!expiresAt || Date.now() > expiresAt) {
    return { ok: false, reason: '2FA 会话已过期，请重新登录' }
  }

  const user = await db
    .prepare('SELECT id, username, totp_secret, totp_enabled FROM users WHERE username = ?')
    .bind(username)
    .first<{ id: number; username: string; totp_secret: string; totp_enabled: number }>()
  if (!user || !user.totp_secret) return { ok: false, reason: '账户不存在或未启用 2FA' }

  const expectedMac = await hmacSha1Hex(user.totp_secret, `${username}.${expiresAt}`)
  if (expectedMac.length !== mac.length) return { ok: false, reason: '2FA token 无效' }
  let diff = 0
  for (let i = 0; i < expectedMac.length; i++) {
    diff |= expectedMac.charCodeAt(i) ^ mac.charCodeAt(i)
  }
  if (diff !== 0) return { ok: false, reason: '2FA token 无效' }

  return { ok: true, user }
}

export async function onRequestPost(context: {
  request: Request
  env: { DB: D1Database }
}) {
  const { request, env } = context
  let body: { identifier?: string; password?: string; twofa_token?: string; code?: string }
  try {
    body = await request.json()
  } catch {
    return error('请求体格式错误')
  }

  // ---------- 2FA 第二步：验证验证码 ----------
  if (body.twofa_token) {
    return verify2fa(env.DB, body.twofa_token, body.code || '')
  }

  // ---------- 第一步：用户名/密码 ----------
  const identifier = (body.identifier || '').trim().toLowerCase()
  const password = body.password || ''

  if (!identifier || !password) {
    return error('请输入用户名/邮箱和密码')
  }

  const decision = await checkLoginRateLimit(env.DB, request, identifier)
  if (!decision.allowed) {
    return error(decision.reason || '登录过于频繁', 429, {
      'Retry-After': String(decision.retryAfterSec),
    })
  }

  const user = await env.DB
    .prepare(
      'SELECT id, username, email, role, avatar, bio, created_at, password_hash, salt, totp_secret, totp_enabled FROM users WHERE username = ? OR email = ?'
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
      totp_secret: string
      totp_enabled: number
    }>()

  if (!user) {
    await recordLoginAttempt(env.DB, request, identifier, false)
    void pruneLoginAttempts(env.DB)
    return error('用户名或密码错误', 401)
  }

  const ok = await verifyPassword(password, user.salt, user.password_hash)
  if (!ok) {
    await recordLoginAttempt(env.DB, request, identifier, false)
    void pruneLoginAttempts(env.DB)
    return error('用户名或密码错误', 401)
  }

  // 密码对了。如果开启 2FA，先不发 session，让前端再验证一次
  if (user.totp_enabled && user.totp_secret) {
    const twofaToken = await issue2faToken(user.username, user.totp_secret)
    return json({
      requires_2fa: true,
      twofa_token: twofaToken,
      message: '请输入两步验证码',
    })
  }

  await clearLoginFailures(env.DB, request, identifier)
  await recordLoginAttempt(env.DB, request, identifier, true)

  const token = await createSession(env.DB, user.id)
  const { password_hash, salt, totp_secret, totp_enabled, ...safeUser } = user

  return json({ user: safeUser, token }, 200, {
    'Set-Cookie': sessionCookie(token),
  })
}

async function verify2fa(db: D1Database, twofaToken: string, code: string) {
  const check = await verify2faToken(db, twofaToken)
  if (!check.ok) {
    return error(check.reason || '2FA token 无效', 401)
  }

  const { user } = check
  if (!user.totp_enabled) return error('该账户未启用 2FA', 400)
  if (!/^\d{6}$/.test(code)) return error('验证码格式不正确')

  const ok = await verifyTotp(user.totp_secret, code)
  if (!ok) return error('验证码错误', 403)

  // 2FA 通过，创建 session
  const fullUser = await db
    .prepare('SELECT id, username, email, role, avatar, bio, created_at FROM users WHERE id = ?')
    .bind(user.id)
    .first<{
      id: number
      username: string
      email: string
      role: string
      avatar: string
      bio: string
      created_at: string
    }>()
  if (!fullUser) return error('用户不存在', 404)

  const token = await createSession(db, user.id)
  return json({ user: fullUser, token }, 200, {
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
