// /api/search?q=关键词
// 全文搜索帖子标题/摘要/正文/标签

import { json, error } from './_helpers'

export async function onRequestGet(context: {
  request: Request
  env: { DB: D1Database }
}) {
  const { request, env } = context
  const url = new URL(request.url)
  const q = (url.searchParams.get('q') || '').trim()
  if (!q) return json({ query: '', posts: [] })

  // FTS5 query: 用 OR 连接每个 token，避免空结果
  // 例如 "react cloudflare" → "react OR cloudflare"
  // 单个 token 直接用前缀匹配，支持中文
  const tokens = q.split(/\s+/).filter(Boolean)
  if (tokens.length === 0) return json({ query: q, posts: [] })

  const ftsQuery = tokens.map((t) => `"${t.replace(/"/g, '""')}"*`).join(' OR ')

  try {
    const result = await env.DB
      .prepare(
        `SELECT p.id, p.title, p.slug, p.excerpt, p.category, p.cover_image,
          p.views, p.created_at, p.author_id,
          u.username AS author_username,
          (SELECT COUNT(*) FROM likes l WHERE l.post_id = p.id) AS likes_count,
          (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) AS comments_count,
          snippet(posts_fts, 2, '<mark>', '</mark>', '…', 20) AS highlight
         FROM posts_fts
         JOIN posts p ON p.id = posts_fts.rowid
         LEFT JOIN users u ON p.author_id = u.id
         WHERE posts_fts MATCH ? AND p.published = 1
         ORDER BY rank
         LIMIT 30`
      )
      .bind(ftsQuery)
      .all()
    return json({ query: q, posts: result.results })
  } catch (err) {
    return error('搜索失败：' + String(err), 500)
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
