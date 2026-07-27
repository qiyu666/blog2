// GET /api/auth/me → current user
import { json } from '../_helpers'
import { getSession } from '../_auth'

export async function onRequestGet(context: {
  request: Request
  env: { DB: D1Database }
}) {
  const { request, env } = context
  const { user } = await getSession(request, env.DB)
  if (!user) return json({ user: null })
  return json({ user })
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
