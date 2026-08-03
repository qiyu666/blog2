// /api/subscribe
// POST → 订阅邮箱（写入 subscriptions 表，返回成功）
//   body: { email: string }
// 简化版：不发送确认邮件，直接订阅成功（token 用于后续退订）

import { json, error } from './_helpers'

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254
}

function generateToken(): string {
  const arr = new Uint8Array(32)
  crypto.getRandomValues(arr)
  return Array.from(arr).map((b) => b.toString(16).padStart(2, '0')).join('')
}

export async function onRequestPost(context: {
  request: Request
  env: { DB: D1Database }
}) {
  const { request, env } = context
  let body: { email?: string }
  try {
    body = await request.json()
  } catch {
    return error('Invalid JSON body')
  }

  const email = (body.email || '').trim().toLowerCase()
  if (!isValidEmail(email)) return error('邮箱地址无效')

  const token = generateToken()
  try {
    // 已存在则更新 token（避免重复）
    const existing = await env.DB
      .prepare('SELECT id FROM subscriptions WHERE email = ?')
      .bind(email)
      .first()
    if (existing) {
      await env.DB
        .prepare('UPDATE subscriptions SET token = ? WHERE email = ?')
        .bind(token, email)
        .run()
    } else {
      await env.DB
        .prepare('INSERT INTO subscriptions (email, token, confirmed) VALUES (?, ?, 1)')
        .bind(email, token)
        .run()
    }
    return json({ ok: true, message: '订阅成功' })
  } catch (err) {
    return error('订阅失败：' + String(err), 500)
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
