import { createSession, sessionCookie, getSession } from '../../_auth'

const GITHUB_TOKEN_URL = 'https://github.com/login/oauth/access_token'
const GITHUB_USER_URL = 'https://api.github.com/user'

export async function onRequestGet(context: {
  request: Request
  env: { DB: D1Database; GITHUB_CLIENT_ID: string; GITHUB_CLIENT_SECRET: string }
}) {
  const { request, env } = context
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  const errorParam = url.searchParams.get('error')
  const errorDesc = url.searchParams.get('error_description')

  if (errorParam) {
    return redirectWithError(`GitHub 授权失败：${errorDesc || errorParam}`)
  }

  if (!code) return redirectWithError('缺少授权码')

  // CSRF 防护：校验 oauth_state cookie 与 URL state 参数是否匹配
  const cookieHeader = request.headers.get('Cookie') || ''
  const cookieState = (cookieHeader.match(/oauth_state=([^;]+)/) || [])[1]
  if (!cookieState || cookieState !== state) {
    return redirectWithError('OAuth state 校验失败')
  }

  let tokenData: { access_token?: string; error?: string; error_description?: string }
  try {
    const tokenRes = await fetch(GITHUB_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        client_id: env.GITHUB_CLIENT_ID,
        client_secret: env.GITHUB_CLIENT_SECRET,
        code,
        state,
      }),
    })
    tokenData = await tokenRes.json()
  } catch (err) {
    return redirectWithError('请求 GitHub 令牌失败：' + String(err))
  }

  if (!tokenData.access_token) {
    return redirectWithError('获取访问令牌失败：' + (tokenData.error_description || tokenData.error || 'unknown'))
  }

  let githubUser: { login?: string; avatar_url?: string; name?: string; bio?: string }
  try {
    const userRes = await fetch(GITHUB_USER_URL, {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'User-Agent': 'blog2',
        'Accept': 'application/json',
      },
    })
    githubUser = await userRes.json()
  } catch (err) {
    return redirectWithError('获取 GitHub 用户信息失败：' + String(err))
  }

  if (!githubUser.login) {
    return redirectWithError('无法获取 GitHub 用户名')
  }

  let primaryEmail = ''
  try {
    const emailRes = await fetch(`${GITHUB_USER_URL}/emails`, {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'User-Agent': 'blog2',
        'Accept': 'application/json',
      },
    })
    const emails = await emailRes.json()
    if (Array.isArray(emails)) {
      const found = emails.find((e: { primary?: boolean; email?: string }) => e.primary)
      if (found) primaryEmail = found.email || ''
    }
  } catch {
    // ignore email fetch error
  }

  if (!primaryEmail) {
    primaryEmail = `${githubUser.login}@users.noreply.github.com`
  }

  // 账号绑定流程：读取 oauth_bind cookie，若为 1 且当前已登录则绑定 GitHub 账号
  const oauthBind = (cookieHeader.match(/oauth_bind=([^;]+)/) || [])[1]
  if (oauthBind === '1') {
    const { user: currentUser } = await getSession(request, env.DB)
    if (currentUser) {
      // 已登录：更新当前用户的 social_github（用 try/catch 包裹防止列不存在）
      try {
        await env.DB
          .prepare('UPDATE users SET social_github = ? WHERE id = ?')
          .bind(githubUser.login, currentUser.id)
          .run()
      } catch {
        // social_github 列不存在时静默跳过
      }
      // 仅当当前头像为空时更新为 GitHub 头像
      if (!currentUser.avatar && githubUser.avatar_url) {
        try {
          await env.DB
            .prepare('UPDATE users SET avatar = ? WHERE id = ?')
            .bind(githubUser.avatar_url, currentUser.id)
            .run()
        } catch {
          // 静默跳过
        }
      }
      // 清除 oauth_state 与 oauth_bind cookie，重定向到设置页
      const bindHeaders = new Headers()
      bindHeaders.set('Location', '/settings?github_bind=success')
      bindHeaders.append('Set-Cookie', 'oauth_state=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0')
      bindHeaders.append('Set-Cookie', 'oauth_bind=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0')
      return new Response(null, { status: 302, headers: bindHeaders })
    }
    // 未登录：忽略 bind 标记，走正常登录/注册流程
  }

  let userId: number
  try {
    const existingByUsername = await env.DB
      .prepare('SELECT id, password_hash FROM users WHERE username = ?')
      .bind(githubUser.login)
      .first<{ id: number; password_hash: string }>()

    if (existingByUsername) {
      if (existingByUsername.password_hash && existingByUsername.password_hash !== '') {
        // 用户名冲突：本地密码账号占用了该用户名，不复用此账号
        // 改为创建新用户，用户名为 githubUser.login + '_gh'，若冲突再追加数字
        let baseName = `${githubUser.login}_gh`
        let candidateName = baseName
        let suffix = 2
        // 确保新用户名唯一
        while (true) {
          const clash = await env.DB
            .prepare('SELECT id FROM users WHERE username = ?')
            .bind(candidateName)
            .first()
          if (!clash) break
          candidateName = `${baseName}${suffix++}`
        }

        const existingByEmail = await env.DB
          .prepare('SELECT id FROM users WHERE email = ?')
          .bind(primaryEmail)
          .first<{ id: number }>()

        let emailToUse = primaryEmail
        if (existingByEmail) {
          emailToUse = `${githubUser.login}_${Date.now()}@users.noreply.github.com`
        }

        const avatar = githubUser.avatar_url || ''
        const displayName = githubUser.name || githubUser.login
        const bio = githubUser.bio || ''

        const result = await env.DB
          .prepare(
            `INSERT INTO users (username, email, display_name, avatar, bio, password_hash, salt, role, social_github)
             VALUES (?, ?, ?, ?, ?, '', '', 'member', ?)`
          )
          .bind(candidateName, emailToUse, displayName, avatar, bio, githubUser.login)
          .run()

        userId = Number(result.lastInsertRowId || 0)
        if (!userId) {
          return redirectWithError('无法获取新用户 ID')
        }
      } else {
        // OAuth 账号：当作老用户登录，如果 social_github 为空则自动填充
        userId = existingByUsername.id
        try {
          await env.DB
            .prepare('UPDATE users SET social_github = ? WHERE id = ? AND (social_github IS NULL OR social_github = \'\')')
            .bind(githubUser.login, userId)
            .run()
        } catch {
          // social_github 列不存在时静默跳过
        }
      }
    } else {
      const existingByEmail = await env.DB
        .prepare('SELECT id FROM users WHERE email = ?')
        .bind(primaryEmail)
        .first<{ id: number }>()

      let emailToUse = primaryEmail
      if (existingByEmail) {
        emailToUse = `${githubUser.login}_${Date.now()}@users.noreply.github.com`
      }

      const avatar = githubUser.avatar_url || ''
      const displayName = githubUser.name || githubUser.login
      const bio = githubUser.bio || ''

      const result = await env.DB
        .prepare(
          `INSERT INTO users (username, email, display_name, avatar, bio, password_hash, salt, role, social_github)
           VALUES (?, ?, ?, ?, ?, '', '', 'member', ?)`
        )
        .bind(githubUser.login, emailToUse, displayName, avatar, bio, githubUser.login)
        .run()

      userId = Number(result.lastInsertRowId || 0)
      if (!userId) {
        return redirectWithError('无法获取新用户 ID')
      }
    }
  } catch (err) {
    return redirectWithError('数据库操作失败：' + String(err))
  }

  let sessionToken: string
  try {
    sessionToken = await createSession(env.DB, userId)
  } catch (err) {
    return redirectWithError('创建会话失败：' + String(err))
  }

  const cookie = sessionCookie(sessionToken)

  // 清除 oauth_state cookie（已校验完毕，不再需要）
  const finalHeaders = new Headers()
  finalHeaders.set('Location', '/github-callback')
  finalHeaders.append('Set-Cookie', cookie)
  finalHeaders.append('Set-Cookie', 'oauth_state=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0')

  return new Response(null, {
    status: 302,
    headers: finalHeaders,
  })
}

function redirectWithError(message: string): Response {
  const encoded = encodeURIComponent(message)
  return new Response(null, {
    status: 302,
    headers: {
      'Location': `/login?github_error=${encoded}`,
    },
  })
}
