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
            profile_css, profile_bg, profile_layout, created_at,
            social_github, social_twitter, social_qq, social_wechat,
            social_telegram, social_bilibili, social_email
           FROM users WHERE username = ?`
        )
        .bind(username)
        .first()
    } catch {
      // 如果 social_* 列不存在，回退到旧查询
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
        // 如果 profile_layout 列不存在，回退到更旧的查询
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
      if (user) {
        user.social_github = ''
        user.social_twitter = ''
        user.social_qq = ''
        user.social_wechat = ''
        user.social_telegram = ''
        user.social_bilibili = ''
        user.social_email = ''
      }
    }
    if (!user) return error('用户不存在', 404)

    let posts = { results: [] as any[] }
    try {
      posts = await env.DB
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
    } catch {
      // posts 表或 author_id 列不存在，返回空数组
    }

    let stats: any = {
      posts_count: 0,
      comments_count: 0,
      total_likes_received: 0,
      total_favorites_received: 0,
      total_comments_received: 0,
      following_count: 0,
      followers_count: 0,
    }
    try {
      stats = await env.DB
        .prepare(
          `SELECT
            (SELECT COUNT(*) FROM posts p WHERE p.author_id = ? AND p.published = 1) AS posts_count,
            (SELECT COUNT(*) FROM comments c WHERE c.user_id = ?) AS comments_count,
            (SELECT COUNT(*) FROM likes l JOIN posts p ON l.post_id = p.id WHERE p.author_id = ?) AS total_likes_received,
            (SELECT COUNT(*) FROM favorites f JOIN posts p ON f.post_id = p.id WHERE p.author_id = ?) AS total_favorites_received,
            (SELECT COUNT(*) FROM comments c JOIN posts p ON c.post_id = p.id WHERE p.author_id = ?) AS total_comments_received,
            (SELECT COUNT(*) FROM follows fl WHERE fl.follower_id = ?) AS following_count,
            (SELECT COUNT(*) FROM follows fl WHERE fl.following_id = ?) AS followers_count
           FROM users WHERE id = ?`
        )
        .bind(user.id, user.id, user.id, user.id, user.id, user.id, user.id, user.id)
        .first()
      if (!stats) {
        stats = {
          posts_count: 0, comments_count: 0, total_likes_received: 0,
          total_favorites_received: 0, total_comments_received: 0,
          following_count: 0, followers_count: 0,
        }
      }
    } catch {
      // 统计查询失败（表/列缺失），使用默认值
    }

    // 用户文章分类列表（用于前端筛选）
    let categories: Array<{ category: string; count: number }> = []
    try {
      const cats = await env.DB
        .prepare(
          `SELECT category, COUNT(*) as count FROM posts
           WHERE author_id = ? AND published = 1
           GROUP BY category`
        )
        .bind(user.id)
        .all()
      categories = (cats.results || []).filter((c: any) => c.category)
    } catch {
      // 查询失败，返回空数组
    }

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

    return json({ user, posts: posts.results, stats, categories, is_following: isFollowing })
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
    profile_layout?: string
    social_github?: string
    social_twitter?: string
    social_qq?: string
    social_wechat?: string
    social_telegram?: string
    social_bilibili?: string
    social_email?: string
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
        paramsArr.push(body.profile_layout || '')
      } catch {
        // 列不存在，跳过
      }
    }

    // 社交联系方式字段（v9 一起添加，检查一次即可）
    const socialFields: Array<[string, string | undefined]> = [
      ['social_github', body.social_github],
      ['social_twitter', body.social_twitter],
      ['social_qq', body.social_qq],
      ['social_wechat', body.social_wechat],
      ['social_telegram', body.social_telegram],
      ['social_bilibili', body.social_bilibili],
      ['social_email', body.social_email],
    ]
    const socialProvided = socialFields.filter(([, v]) => v !== undefined)
    if (socialProvided.length > 0) {
      try {
        await env.DB.prepare('SELECT social_github FROM users WHERE id = ?').bind(user.id).first()
        for (const [col, val] of socialProvided) {
          updates.push(`${col} = ?`)
          paramsArr.push(cleanText(val || '', 200).trim())
        }
      } catch {
        // social_* 列不存在，跳过
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
            location, website, profile_css, profile_bg, profile_layout, created_at,
            social_github, social_twitter, social_qq, social_wechat,
            social_telegram, social_bilibili, social_email
           FROM users WHERE id = ?`
        )
        .bind(user.id)
        .first()
    } catch {
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
      if (updated) {
        updated.social_github = ''
        updated.social_twitter = ''
        updated.social_qq = ''
        updated.social_wechat = ''
        updated.social_telegram = ''
        updated.social_bilibili = ''
        updated.social_email = ''
      }
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
