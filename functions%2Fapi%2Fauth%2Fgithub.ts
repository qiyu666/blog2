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

  return new Response(null, {
    status: 302,
    headers: {
      'Location': authUrl,
    },
  })
}
