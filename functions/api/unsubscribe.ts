// /api/unsubscribe
// DELETE → 退订（需提供 token）
//   ?token=xxx

import { json, error } from './_helpers'

export async function onRequestDelete(context: {
  request: Request
  env: { DB: D1Database }
}) {
  const { request, env } = context
  const url = new URL(request.url)
  const token = url.searchParams.get('token')
  if (!token) return error('缺少退订 token')

  try {
    await env.DB
      .prepare('DELETE FROM subscriptions WHERE token = ?')
      .bind(token)
      .run()
    return json({ ok: true })
  } catch (err) {
    return error('退订失败：' + String(err), 500)
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
