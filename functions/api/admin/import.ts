// /api/admin/import
// POST → import posts from a JSON array (or { posts: [...] }) (admin only)
//   - skips posts whose slug already exists
//   - returns { imported, skipped, total }

import { json, error, slugify, uniqueSlug } from '../_helpers'
import { getSession, cleanText } from '../_auth'
import { enforceAdminRateLimit } from '../_rate-limit'

interface ImportPost {
  title?: string
  slug?: string
  excerpt?: string
  content?: string
  author?: string
  category?: string
  tags?: string
  cover_image?: string
  published?: number
  is_pinned?: number
  is_featured?: number
  custom_js?: string
  created_at?: string
  updated_at?: string
  views?: number
}

export async function onRequestPost(context: {
  request: Request
  env: { DB: D1Database }
}) {
  const { request, env } = context
  const unauthLimit = await enforceAdminRateLimit(env.DB, request, false)
  if (unauthLimit) return unauthLimit

  const { user } = await getSession(request, env.DB)
  if (!user) return error('请先登录', 401)
  if (user.role !== 'admin') return error('无权访问', 403)

  const authLimit = await enforceAdminRateLimit(env.DB, request, true)
  if (authLimit) return authLimit

  let payload: ImportPost[] | { posts?: ImportPost[] }
  try {
    payload = await request.json()
  } catch {
    return error('请求体格式错误，需要 JSON', 400)
  }

  const list: ImportPost[] = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.posts)
      ? payload.posts
      : []

  if (list.length === 0) return error('未发现可导入的文章', 400)
  if (list.length > 1000) return error('单次最多导入 1000 篇文章', 400)

  let imported = 0
  let skipped = 0
  const errors: string[] = []

  for (let i = 0; i < list.length; i++) {
    const item = list[i]
    const title = cleanText(item.title || '', 200).trim()
    const content = cleanText(item.content || '', 50000)
    if (!title || !content) {
      errors.push(`第 ${i + 1} 篇缺少标题或内容，已跳过`)
      skipped++
      continue
    }

    const excerpt =
      cleanText(item.excerpt || '', 500).trim() || content.slice(0, 150) + '...'
    const category = cleanText(item.category || '', 50).trim() || 'General'
    const tags = cleanText(item.tags || '', 200).trim()
    const coverImage = cleanText(item.cover_image || '', 500).trim()
    const customJs = cleanText(item.custom_js || '', 20000)
    const author = cleanText(item.author || '', 100).trim() || 'Anonymous'
    const published = item.published === 0 ? 0 : 1
    const isPinned = item.is_pinned === 1 ? 1 : 0
    const isFeatured = item.is_featured === 1 ? 1 : 0
    const views = Number.isFinite(item.views) && (item.views || 0) >= 0 ? Number(item.views) : 0

    const baseSlug = item.slug ? cleanText(item.slug, 200).trim() : slugify(title)
    if (!baseSlug) {
      errors.push(`第 ${i + 1} 篇无法生成 slug，已跳过`)
      skipped++
      continue
    }

    // 检查 slug 是否已存在
    const existing = await env.DB
      .prepare('SELECT id FROM posts WHERE slug = ?')
      .bind(baseSlug)
      .first()
    if (existing) {
      skipped++
      continue
    }

    // 确保 slug 唯一（理论上刚检查过，但并发情况下仍可能冲突）
    const finalSlug = await uniqueSlug(env.DB, baseSlug)

    try {
      // 处理自定义时间（允许导入历史时间）；否则使用当前时间
      const createdAt = item.created_at || new Date().toISOString().replace('T', ' ').replace(/\.\d+Z$/, '')
      const updatedAt = item.updated_at || createdAt

      await env.DB
        .prepare(
          `INSERT INTO posts
            (title, slug, excerpt, content, author, category, tags, cover_image,
             published, is_pinned, is_featured, custom_js, views, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(
          title,
          finalSlug,
          excerpt,
          content,
          author,
          category,
          tags,
          coverImage,
          published,
          isPinned,
          isFeatured,
          customJs,
          views,
          createdAt,
          updatedAt,
        )
        .run()
      imported++
    } catch (err) {
      errors.push(`第 ${i + 1} 篇导入失败：${String(err)}`)
      skipped++
    }
  }

  return json({
    success: true,
    imported,
    skipped,
    total: list.length,
    errors: errors.length > 0 ? errors.slice(0, 20) : undefined,
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
