// /api/users/:username
// GET → public profile + posts list
// PATCH → update own profile (auth required)

import { json, error } from '../_helpers'
import { getSession, cleanText } from '../_auth'
import { sanitizeCSS } from '../_css-sanitizer'

export async function onRequestGet(context: {
  request: Request
  params: { username: string }
  env: { DB: D1Database }
}) {
  const { params, env } = context
  const username = decodeURIComponent(params.username)

  try {
    let user: any = null
    try {
      user = await env.DB
        .prepare(
          `SELECT id, username, display_name, role, avatar, bio, location, website,
            profile_css, profile_bg, profile_layout, created_at
           FROM users WHERE username = ?`
        )
        .bind(username)
        .first()
    } catch {
      // 如果 profile_layout 列不存在，回退到旧查询
      user = await env.DB
        .prepare(
          `SELECT id, username, display_name, role, avatar, bio, location, website,
            profile_css, profile_bg, created_at
           FROM users WHERE username = ?`
        )
        .bind(username)
        .first()
      if (user) user.profile_layout = ''
    }
    if (!user) return error('用户不存在', 404)

    const posts = await env.DB
      .prepare(
        `SELECT p.id, p.title, p.slug, p.category, p.excerpt, p.cover_image,
          p.views, p.created_at,
          (SELECT COUNT(*) FROM likes l WHERE l.post_id = p.id) AS likes_count,
          (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) AS comments_count
         FROM posts p
         WHERE p.author_id = ? AND p.published = 1
         ORDER BY p.created_at DESC
         LIMIT 50`
      )
      .bind(user.id)
      .all()

    const stats = await env.DB
      .prepare(
        `SELECT
          (SELECT COUNT(*) FROM posts p WHERE p.author_id = ? AND p.published = 1) AS posts_count,
          (SELECT COUNT(*) FROM comments c WHERE c.user_id = ?) AS comments_count,
          (SELECT COUNT(*) FROM likes l JOIN posts p ON l.post_id = p.id WHERE p.author_id = ?) AS total_likes_received,
          (SELECT COUNT(*) FROM favorites f JOIN posts p ON f.post_id = p.id WHERE p.author_id = ?) AS total_favorites_received,
          (SELECT COUNT(*) FROM follows fl WHERE fl.follower_id = ?) AS following_count,
          (SELECT COUNT(*) FROM follows fl WHERE fl.following_id = ?) AS followers_count
         FROM users WHERE id = ?`
      )
      .bind(user.id, user.id, user.id, user.id, user.id, user.id, user.id)
      .first()

    // 当前用户是否关注了此人
    const { user: currentUser } = await getSession(context.request, env.DB)
    let isFollowing = false
    if (currentUser && currentUser.id !== user.id) {
      const row = await env.DB
        .prepare('SELECT id FROM follows WHERE follower_id = ? AND following_id = ?')
        .bind(currentUser.id, user.id)
        .first()
      isFollowing = !!row
    }

    return json({ user, posts: posts.results, stats, is_following: isFollowing })
  } catch (err) {
    return error('Failed to fetch profile: ' + String(err), 500)
  }
}

export async function onRequestPatch(context: {
  request: Request
  params: { username: string }
  env: { DB: D1Database }
}) {
  const { request, params, env } = context
  const { user } = await getSession(request, env.DB)
  if (!user) return error('请先登录', 401)

  if (user.username !== decodeURIComponent(params.username)) {
    return error('只能编辑自己的资料', 403)
  }

  let body: {
    display_name?: string
    bio?: string
    avatar?: string
    location?: string
    website?: string
    profile_bg?: string
    profile_css?: string
  }
  try {
    body = await request.json()
  } catch {
    return error('请求体格式错误')
  }

  const displayName = cleanText(body.display_name || '', 50).trim()
  const bio = cleanText(body.bio || '', 500).trim()
  const avatar = cleanText(body.avatar || '', 500).trim()
  const location = cleanText(body.location || '', 100).trim()
  const websiteRaw = cleanText(body.website || '', 200).trim()
  const profileBg = cleanText(body.profile_bg || '', 500).trim()

  let website = ''
  if (websiteRaw) {
    try {
      const url = new URL(websiteRaw.startsWith('http') ? websiteRaw : 'https://' + websiteRaw)
      if (url.protocol === 'http:' || url.protocol === 'https:') {
        website = url.toString()
      }
    } catch {
      // ignore invalid
    }
  }

  let profileCSS = ''
  if (body.profile_css !== undefined) {
    profileCSS = sanitizeCSS(body.profile_css, 10000)
  }

  try {
    const updates: string[] = []
    const paramsArr: (string | number)[] = []

    if (body.display_name !== undefined) { updates.push('display_name = ?'); paramsArr.push(displayName) }
    if (body.bio !== undefined) { updates.push('bio = ?'); paramsArr.push(bio) }
    if (body.avatar !== undefined) { updates.push('avatar = ?'); paramsArr.push(avatar) }
    if (body.location !== undefined) { updates.push('location = ?'); paramsArr.push(location) }
    if (body.website !== undefined) { updates.push('website = ?'); paramsArr.push(website) }
    if (body.profile_bg !== undefined) { updates.push('profile_bg = ?'); paramsArr.push(profileBg) }
    if (body.profile_css !== undefined) { updates.push('profile_css = ?'); paramsArr.push(profileCSS) }
    if (body.profile_layout !== undefined) {
      // 尝试更新 profile_layout，如果列不存在则跳过
      try {
        await env.DB.prepare('SELECT profile_layout FROM users WHERE id = ?').bind(user.id).first()
        updates.push('profile_layout = ?')
        paramsArr.push(profileLayout)
      } catch {
        // 列不存在，跳过
      }
    }

    if (updates.length === 0) {
      return json({ success: true, message: '没有需要更新的字段' })
    }

    paramsArr.push(user.id)
    const sql = `UPDATE users SET ${updates.join(', ')} WHERE id = ?`

    await env.DB.prepare(sql).bind(...paramsArr).run()

    let updated: any = null
    try {
      updated = await env.DB
        .prepare(
          `SELECT id, username, display_name, email, role, avatar, bio,
            location, website, profile_css, profile_bg, profile_layout, created_at
           FROM users WHERE id = ?`
        )
        .bind(user.id)
        .first()
    } catch {
      updated = await env.DB
        .prepare(
          `SELECT id, username, display_name, email, role, avatar, bio,
            location, website, profile_css, profile_bg, created_at
           FROM users WHERE id = ?`
        )
        .bind(user.id)
        .first()
      if (updated) updated.profile_layout = ''
    }

    return json({ user: updated, success: true })
  } catch (err) {
    return error('更新失败：' + String(err), 500)
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, PATCH, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
