// /api/categories
// 公开分类列表接口，供发帖/编辑时选择分类使用
// GET → 返回所有分类（含文章数），无需登录

import { json, error, slugify, cachedJson } from './_helpers'

export async function onRequestGet(context: {
  request: Request
  env: { DB: D1Database }
}) {
  const { env } = context

  try {
    // 确保 categories 表存在
    await env.DB.prepare(
      `CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        slug TEXT NOT NULL UNIQUE,
        description TEXT DEFAULT '',
        icon TEXT DEFAULT '📂',
        sort_order INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      )`
    ).run()
    await env.DB.prepare(
      `CREATE INDEX IF NOT EXISTS idx_categories_sort ON categories(sort_order, name)`
    ).run()
  } catch {}

  // 从现有文章导入不存在的分类
  try {
    const posts = await env.DB.prepare(
      "SELECT DISTINCT category FROM posts WHERE category IS NOT NULL AND category != ''"
    ).all<{ category: string }>()
    for (const row of posts.results || []) {
      const name = row.category?.trim()
      if (!name) continue
      const exists = await env.DB.prepare('SELECT id FROM categories WHERE name = ?')
        .bind(name).first()
      if (!exists) {
        const slug = await uniqueCategorySlug(env.DB, slugify(name))
        await env.DB.prepare(
          'INSERT OR IGNORE INTO categories (name, slug, description, icon, sort_order) VALUES (?, ?, ?, ?, ?)'
        ).bind(name, slug, '', '📂', 0).run()
      }
    }
  } catch {}

  try {
    const rows = await env.DB.prepare(
      `SELECT c.id, c.name, c.slug, c.icon,
        (SELECT COUNT(*) FROM posts p WHERE p.category = c.name) AS count
       FROM categories c
       ORDER BY c.sort_order ASC, c.name ASC`
    ).all()
    return cachedJson(rows.results, { browserMaxAge: 120, cdnMaxAge: 1800, swr: 600 })
  } catch (err) {
    return error('获取分类失败：' + String(err), 500)
  }
}

async function uniqueCategorySlug(db: D1Database, base: string): Promise<string> {
  let candidate = base || 'category'
  let n = 1
  while (true) {
    const existing = await db.prepare('SELECT id FROM categories WHERE slug = ?')
      .bind(candidate).first()
    if (!existing) return candidate
    candidate = `${base}-${++n}`
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
