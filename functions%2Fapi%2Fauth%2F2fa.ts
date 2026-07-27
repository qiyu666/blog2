// /api/auth/2fa
// POST   → { action: 'setup' }               生成密钥，返回 otpauth URL
//          { action: 'enable', code: '123456' }  验证并启用
//          { action: 'disable', code: '123456' } 验证并关闭
// GET    → 当前用户 2FA 状态

import { json, error } from '../_helpers'
import { getSession } from '../_auth'
import { generateTotpSecret, verifyTotp, buildOtpAuthUrl } from '../_totp'

const ISSUER = 'Marginalia Blog'

export async function onRequestGet(context: {
  request: Request
  env: { DB: D1Database }
}) {
  const { request, env } = context
  const { user } = await getSession(request, env.DB)
  if (!user) return error('请先登录', 401)

  const row = await env.DB
    .prepare('SELECT totp_enabled FROM users WHERE id = ?')
    .bind(user.id)
    .first<{ totp_enabled: number }>()
  return json({ enabled: !!(row?.totp_enabled) })
}

export async function onRequestPost(context: {
  request: Request
  env: { DB: D1Database }
}) {
  const { request, env } = context
  const { user } = await getSession(request, env.DB)
  if (!user) return error('请先登录', 401)

  let body: { action?: string; code?: string }
  try {
    body = await request.json()
  } catch {
    return error('请求体格式错误')
  }

  const action = body.action || ''
  const code = (body.code || '').trim()

  if (action === 'setup') {
    // 生成临时 secret，先存到 DB（totp_enabled 仍为 0）
    const secret = generateTotpSecret()
    await env.DB.prepare('UPDATE users SET totp_secret = ? WHERE id = ?')
      .bind(secret, user.id)
      .run()
    const otpauthUrl = buildOtpAuthUrl({
      issuer: ISSUER,
      accountName: user.username,
      secret,
    })
    return json({ secret, otpauth_url: otpauthUrl })
  }

  if (action === 'enable') {
    const row = await env.DB
      .prepare('SELECT totp_secret, totp_enabled FROM users WHERE id = ?')
      .bind(user.id)
      .first<{ totp_secret: string; totp_enabled: number }>()
    if (!row?.totp_secret) return error('请先调用 setup 生成密钥')
    if (row.totp_enabled) return json({ enabled: true, message: '2FA 已开启' })
    if (!code) return error('请输入验证码')

    const ok = await verifyTotp(row.totp_secret, code)
    if (!ok) return error('验证码错误', 403)

    await env.DB.prepare('UPDATE users SET totp_enabled = 1 WHERE id = ?')
      .bind(user.id)
      .run()
    return json({ enabled: true, message: '2FA 已开启' })
  }

  if (action === 'disable') {
    const row = await env.DB
      .prepare('SELECT totp_secret, totp_enabled FROM users WHERE id = ?')
      .bind(user.id)
      .first<{ totp_secret: string; totp_enabled: number }>()
    if (!row?.totp_enabled) return json({ enabled: false, message: '2FA 未开启' })
    if (!code) return error('请输入验证码')

    const ok = await verifyTotp(row.totp_secret || '', code)
    if (!ok) return error('验证码错误', 403)

    await env.DB
      .prepare('UPDATE users SET totp_enabled = 0, totp_secret = ? WHERE id = ?')
      .bind('', user.id)
      .run()
    return json({ enabled: false, message: '2FA 已关闭' })
  }

  return error('未知 action，支持 setup / enable / disable')
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
