// /api/admin/categories
// GET    → list all categories with post counts (admin only)
// POST   → create a new category (admin only)
// PATCH  → update a category by id (admin only, ?id=)
// DELETE → delete a category by id (admin only, ?id=)

import { json, error, slugify, uniqueSlug } from '../_helpers'
import { getSession, cleanText } from '../_auth'
import { enforceAdminRateLimit } from '../_rate-limit'

interface CategoryInput {
  name: string
  slug?: string
  description?: string
  icon?: string
  sort_order?: number
}

async function ensureCategoriesTable(db: D1Database) {
  try {
    await db.prepare(
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
    await db.prepare(
      `CREATE INDEX IF NOT EXISTS idx_categories_sort ON categories(sort_order, name)`
    ).run()
  } catch {}
}

// 从现有文章的 category 字段导入到独立表（只导入不存在的）
async function importPostCategories(db: D1Database) {
  try {
    const posts = await db.prepare(
      "SELECT DISTINCT category FROM posts WHERE category IS NOT NULL AND category != ''"
    ).all<{ category: string }>()
    for (const row of posts.results || []) {
      const name = row.category?.trim()
      if (!name) continue
      const exists = await db.prepare('SELECT id FROM categories WHERE name = ?')
        .bind(name).first()
      if (!exists) {
        const slug = await uniqueCategorySlug(db, slugify(name))
        await db.prepare(
          'INSERT OR IGNORE INTO categories (name, slug, description, icon, sort_order) VALUES (?, ?, ?, ?, ?)'
        ).bind(name, slug, '', '📂', 0).run()
      }
    }
  } catch {}
}

export async function onRequestGet(context: {
  request: Request
  env: { DB: D1Database }
}) {
  const { request, env } = context
  const { user } = await getSession(request, env.DB)
  if (!user) return error('请先登录', 401)
  if (user.role !== 'admin') return error('无权访问', 403)

  await ensureCategoriesTable(env.DB)

  try {
    // 先把现有文章中的分类导入到独立表
    await importPostCategories(env.DB)

    // 返回带文章数的分类列表
    const rows = await env.DB.prepare(
      `SELECT c.id, c.name, c.slug, c.description, c.icon, c.sort_order, c.created_at, c.updated_at,
        (SELECT COUNT(*) FROM posts p WHERE p.category = c.name) AS count
       FROM categories c
       ORDER BY c.sort_order ASC, c.name ASC`
    ).all()
    return json(rows.results)
  } catch (err) {
    return error('获取分类失败：' + String(err), 500)
  }
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

  await ensureCategoriesTable(env.DB)

  let body: CategoryInput
  try {
    body = await request.json()
  } catch {
    return error('请求体格式错误')
  }

  const name = cleanText(body.name, 50).trim()
  if (!name) return error('分类名称不能为空')

  const slugInput = cleanText(body.slug, 50).trim()
  const description = cleanText(body.description || '', 500).trim()
  const icon = cleanText(body.icon || '📂', 10).trim() || '📂'
  const sort_order = typeof body.sort_order === 'number' ? body.sort_order : 0

  const slug = await uniqueCategorySlug(env.DB, slugInput || slugify(name))

  try {
    const result = await env.DB.prepare(
      `INSERT INTO categories (name, slug, description, icon, sort_order)
       VALUES (?, ?, ?, ?, ?)`
    ).bind(name, slug, description, icon, sort_order).run()

    const created = await env.DB.prepare(
      `SELECT c.id, c.name, c.slug, c.description, c.icon, c.sort_order, c.created_at, c.updated_at,
        0 AS count
       FROM categories c WHERE c.id = ?`
    ).bind(result.meta.last_row_id).first()

    return json(created, 201)
  } catch (err) {
    if (String(err).includes('UNIQUE constraint failed')) {
      return error('分类名称或 slug 已存在')
    }
    return error('创建分类失败：' + String(err), 500)
  }
}

export async function onRequestPatch(context: {
  request: Request
  env: { DB: D1Database }
}) {
  const { request, env } = context
  const url = new URL(request.url)
  const id = Number(url.searchParams.get('id'))
  if (!id) return error('缺少分类 id')

  const unauthLimit = await enforceAdminRateLimit(env.DB, request, false)
  if (unauthLimit) return unauthLimit

  const { user } = await getSession(request, env.DB)
  if (!user) return error('请先登录', 401)
  if (user.role !== 'admin') return error('无权访问', 403)

  const authLimit = await enforceAdminRateLimit(env.DB, request, true)
  if (authLimit) return authLimit

  await ensureCategoriesTable(env.DB)

  let body: Partial<CategoryInput>
  try {
    body = await request.json()
  } catch {
    return error('请求体格式错误')
  }

  const existing = await env.DB.prepare(
    'SELECT * FROM categories WHERE id = ?'
  ).bind(id).first()
  if (!existing) return error('分类不存在', 404)

  const sets: string[] = []
  const binds: (string | number)[] = []

  if (body.name !== undefined) {
    const name = cleanText(body.name, 50).trim()
    if (!name) return error('分类名称不能为空')
    sets.push('name = ?')
    binds.push(name)
  }
  if (body.slug !== undefined) {
    const slugInput = cleanText(body.slug, 50).trim()
    const slug = await uniqueCategorySlug(env.DB, slugInput || slugify(body.name || existing.name), id)
    sets.push('slug = ?')
    binds.push(slug)
  }
  if (body.description !== undefined) {
    sets.push('description = ?')
    binds.push(cleanText(body.description, 500).trim())
  }
  if (body.icon !== undefined) {
    sets.push('icon = ?')
    binds.push(cleanText(body.icon, 10).trim() || '📂')
  }
  if (body.sort_order !== undefined) {
    sets.push('sort_order = ?')
    binds.push(typeof body.sort_order === 'number' ? body.sort_order : 0)
  }

  if (sets.length === 0) return error('没有可更新的字段')

  sets.push("updated_at = datetime('now')")
  binds.push(id)

  try {
    // 如果分类名变更，同步更新 posts 表中的 category 字段
    const oldName = existing.name
    const newName = body.name ? cleanText(body.name, 50).trim() : oldName

    await env.DB.prepare(`UPDATE categories SET ${sets.join(', ')} WHERE id = ?`)
      .bind(...binds).run()

    if (newName !== oldName) {
      await env.DB.prepare('UPDATE posts SET category = ? WHERE category = ?')
        .bind(newName, oldName).run()
    }

    const updated = await env.DB.prepare(
      `SELECT c.id, c.name, c.slug, c.description, c.icon, c.sort_order, c.created_at, c.updated_at,
        (SELECT COUNT(*) FROM posts p WHERE p.category = c.name) AS count
       FROM categories c WHERE c.id = ?`
    ).bind(id).first()

    return json(updated)
  } catch (err) {
    if (String(err).includes('UNIQUE constraint failed')) {
      return error('分类名称或 slug 已存在')
    }
    return error('更新分类失败：' + String(err), 500)
  }
}

export async function onRequestDelete(context: {
  request: Request
  env: { DB: D1Database }
}) {
  const { request, env } = context
  const url = new URL(request.url)
  const id = Number(url.searchParams.get('id'))
  if (!id) return error('缺少分类 id')

  const unauthLimit = await enforceAdminRateLimit(env.DB, request, false)
  if (unauthLimit) return unauthLimit

  const { user } = await getSession(request, env.DB)
  if (!user) return error('请先登录', 401)
  if (user.role !== 'admin') return error('无权访问', 403)

  const authLimit = await enforceAdminRateLimit(env.DB, request, true)
  if (authLimit) return authLimit

  await ensureCategoriesTable(env.DB)

  const existing = await env.DB.prepare(
    'SELECT name FROM categories WHERE id = ?'
  ).bind(id).first<{ name: string }>()
  if (!existing) return error('分类不存在', 404)

  try {
    // 删除分类时，将关联文章的 category 置为 'General'
    await env.DB.prepare("UPDATE posts SET category = 'General' WHERE category = ?")
      .bind(existing.name).run()

    await env.DB.prepare('DELETE FROM categories WHERE id = ?')
      .bind(id).run()

    return json({ success: true, id, name: existing.name })
  } catch (err) {
    return error('删除分类失败：' + String(err), 500)
  }
}

async function uniqueCategorySlug(db: D1Database, base: string, excludeId?: number): Promise<string> {
  let candidate = base || 'category'
  let n = 1
  while (true) {
    const query = excludeId
      ? 'SELECT id FROM categories WHERE slug = ? AND id != ?'
      : 'SELECT id FROM categories WHERE slug = ?'
    const params = excludeId ? [candidate, excludeId] : [candidate]
    const existing = await db.prepare(query).bind(...params).first()
    if (!existing) return candidate
    candidate = `${base}-${++n}`
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
