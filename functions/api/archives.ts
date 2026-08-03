// GET /api/archives
// 返回文章归档（按年-月分组，用于归档页面展示）
import { json } from '../_helpers'

export async function onRequestGet(context: { env: { DB: D1Database } }) {
  const rows = await context.env.DB
    .prepare(
      `SELECT id, title, slug, category, created_at,
              u.username AS author_username
       FROM posts p
       LEFT JOIN users u ON p.author_id = u.id
       WHERE p.published = 1
       ORDER BY p.created_at DESC`
    )
    .all<{ id: number; title: string; slug: string; category: string; created_at: string; author_username: string | null }>()

  // 按年-月分组
  const groups = new Map<string, Array<{ id: number; title: string; slug: string; category: string; created_at: string; author_username: string | null }>>()
  for (const row of rows.results) {
    const ym = row.created_at.slice(0, 7) // YYYY-MM
    if (!groups.has(ym)) groups.set(ym, [])
    groups.get(ym)!.push(row)
  }

  const archives = Array.from(groups.entries())
    .map(([ym, items]) => ({
      ym,
      year: Number(ym.slice(0, 4)),
      month: Number(ym.slice(5, 7)),
      count: items.length,
      posts: items,
    }))
    .sort((a, b) => b.ym.localeCompare(a.ym))

  return json({ archives, total: rows.results.length })
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
