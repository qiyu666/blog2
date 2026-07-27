// POST /api/auth/logout
import { json } from '../_helpers'
import { getSession, destroySession, clearSessionCookie } from '../_auth'

export async function onRequestPost(context: {
  request: Request
  env: { DB: D1Database }
}) {
  const { request, env } = context
  const { token } = await getSession(request, env.DB)
  if (token) {
    await destroySession(env.DB, token)
  }
  return json({ success: true }, 200, {
    'Set-Cookie': clearSessionCookie(),
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
