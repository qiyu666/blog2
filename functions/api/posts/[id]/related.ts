// GET /api/posts/[id]/related
// 返回 4-6 篇相关文章
// 综合评分：Jaccard 标签相似度 + 同分类加分 + 热度衰减 + 时效性
// 仅返回已发布文章，排除当前文章

import { json, cachedJson } from '../../_helpers'

interface RelatedPost {
  id: number
  title: string
  slug: string
  excerpt: string
  cover_image: string
  category: string
  tags: string
  created_at: string
  views: number
  likes_count: number
  comments_count: number
}

export async function onRequestGet(context: {
  params: { id: string }
  env: { DB: D1Database }
}) {
  const { params, env } = context
  const { DB } = env
  const slugOrId = params.id

  try {
    const isNumeric = /^\d+$/.test(slugOrId)
    const current = await DB
      .prepare(
        isNumeric
          ? 'SELECT id, category, tags FROM posts WHERE id = ?'
          : 'SELECT id, category, tags FROM posts WHERE slug = ?'
      )
      .bind(slugOrId)
      .first<{ id: number; category: string; tags: string }>()

    if (!current) return json([])

    const currentTags = current.tags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)

    const candidates = await DB.prepare(
      `SELECT p.id, p.title, p.slug, p.excerpt, p.cover_image, p.category, p.tags, p.created_at, p.views,
              (SELECT COUNT(*) FROM likes l WHERE l.post_id = p.id) AS likes_count,
              (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) AS comments_count
       FROM posts p
       WHERE p.published = 1 AND p.id != ?
       ORDER BY
         CASE WHEN p.category = ? THEN 0 ELSE 1 END,
         p.created_at DESC
       LIMIT 80`
    )
      .bind(current.id, current.category)
      .all<RelatedPost>()

    const pool = candidates.results || []

    const now = Date.now()
    const scored = pool.map((p) => {
      const pTags = p.tags
        ? p.tags.split(',').map((t) => t.trim()).filter(Boolean)
        : []

      // Jaccard 相似度：交集 / 并集
      const intersection = pTags.filter((t) => currentTags.includes(t)).length
      const union = new Set([...currentTags, ...pTags]).size
      const jaccard = union > 0 ? intersection / union : 0

      // 同分类加分
      const sameCategory = p.category === current.category ? 0.3 : 0

      // 热度分：点赞 + 评论 + 浏览量，归一化
      const engagement = (p.likes_count || 0) * 3 + (p.comments_count || 0) * 2 + (p.views || 0) * 0.01
      const hotness = Math.min(engagement / 50, 1) // 上限 1

      // 时效衰减：30 天内满分，超过后逐月衰减
      const ageMs = now - new Date(p.created_at + 'Z').getTime()
      const ageDays = ageMs / 86400000
      const recency = ageDays <= 30 ? 1 : Math.max(0, 1 - (ageDays - 30) / 365)

      // 综合评分：Jaccard 40% + 同分类 15% + 热度 20% + 时效 25%
      const score = jaccard * 0.4 + sameCategory * 0.15 + hotness * 0.2 + recency * 0.25

      return { post: p, score }
    })

    scored.sort((a, b) => b.score - a.score)

    const related = scored.slice(0, 6).map((s) => ({
      id: s.post.id,
      title: s.post.title,
      slug: s.post.slug,
      excerpt: s.post.excerpt,
      cover_image: s.post.cover_image,
      category: s.post.category,
      created_at: s.post.created_at,
    }))

    return cachedJson(related, { browserMaxAge: 60, cdnMaxAge: 600, swr: 300 })
  } catch (err) {
    if (String(err).includes('no such table')) {
      return json([])
    }
    return json([])
  }
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
