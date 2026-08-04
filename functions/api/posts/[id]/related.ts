// GET /api/posts/[id]/related
// 返回 4-6 篇相关文章（基于共享标签数，回退到同分类，再回退到最新文章）
// 仅返回已发布文章，排除当前文章
// 返回字段：id, title, slug, excerpt, cover_image, category, created_at

import { json } from '../../_helpers'

interface RelatedPost {
  id: number
  title: string
  slug: string
  excerpt: string
  cover_image: string
  category: string
  tags: string
  created_at: string
}

export async function onRequestGet(context: {
  params: { id: string }
  env: { DB: D1Database }
}) {
  const { params, env } = context
  const { DB } = env
  const slugOrId = params.id

  try {
    // 解析当前文章：拿到 id、tags、category（支持 slug 或数字 id）
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

    // 取候选池：同分类 + 最近 60 篇，足够计算标签重叠度
    // 候选必须已发布且非当前文章
    const candidates = await DB.prepare(
      `SELECT id, title, slug, excerpt, cover_image, category, tags, created_at
       FROM posts
       WHERE published = 1 AND id != ?
       ORDER BY
         CASE WHEN category = ? THEN 0 ELSE 1 END,
         created_at DESC
       LIMIT 60`
    )
      .bind(current.id, current.category)
      .all<RelatedPost>()

    const pool = candidates.results || []

    // 计算每篇候选与当前文章的标签重叠数
    const scored = pool.map((p) => {
      const pTags = p.tags
        ? p.tags.split(',').map((t) => t.trim()).filter(Boolean)
        : []
      const overlap = pTags.filter((t) => currentTags.includes(t)).length
      const sameCategory = p.category === current.category ? 1 : 0
      return { post: p, overlap, sameCategory }
    })

    // 排序：标签重叠数 → 同分类 → 创建时间
    scored.sort((a, b) => {
      if (b.overlap !== a.overlap) return b.overlap - a.overlap
      if (b.sameCategory !== a.sameCategory) return b.sameCategory - a.sameCategory
      return new Date(b.post.created_at).getTime() - new Date(a.post.created_at).getTime()
    })

    const related = scored.slice(0, 6).map((s) => ({
      id: s.post.id,
      title: s.post.title,
      slug: s.post.slug,
      excerpt: s.post.excerpt,
      cover_image: s.post.cover_image,
      category: s.post.category,
      created_at: s.post.created_at,
    }))

    return json(related)
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
