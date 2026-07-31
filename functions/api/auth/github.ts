import { error } from '../_helpers'
import { randomHex } from '../_auth'

const GITHUB_AUTH_URL = 'https://github.com/login/oauth/authorize'
const STATE_BYTES = 16

function buildAuthUrl(clientId: string, state: string, redirectUri: string): string {
  const params = new URLSearchParams({
    client_id: clientId,
    state: state,
    redirect_uri: redirectUri,
    scope: 'read:user,user:email',
  })
  return `${GITHUB_AUTH_URL}?${params.toString()}`
}

export async function onRequestGet(context: {
  request: Request
  env: { DB: D1Database; GITHUB_CLIENT_ID: string; GITHUB_CLIENT_SECRET: string }
}) {
  const { request, env } = context
  const url = new URL(request.url)

  if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET) {
    return error('GitHub OAuth 未配置', 500)
  }

  const state = randomHex(STATE_BYTES)
  const redirectUri = `${url.origin}/api/auth/github/callback`
  const authUrl = buildAuthUrl(env.GITHUB_CLIENT_ID, state, redirectUri)

  // 设置 CSRF 防护 state cookie，callback 中与 URL state 参数比对
  const cookies = [
    `oauth_state=${state}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=600`,
  ]
  // 支持绑定流程：带 bind=1 时额外设置绑定标记 cookie
  if (url.searchParams.get('bind') === '1') {
    cookies.push(`oauth_bind=1; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=600`)
  }

  const headers = new Headers()
  headers.set('Location', authUrl)
  for (const c of cookies) {
    headers.append('Set-Cookie', c)
  }

  return new Response(null, {
    status: 302,
    headers,
  })
}
