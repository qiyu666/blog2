// /api/bugs
// POST → submit a bug report (requires login)
// GET  → list bug reports (admin only)

import { json, error } from './_helpers'
import { getSession, cleanText } from './_auth'

const VALID_TYPES = new Set(['bug', 'feature', 'ui', 'performance', 'security'])
const VALID_SEVERITY = new Set(['low', 'normal', 'high', 'critical'])

export async function onRequestPost(context: {
  request: Request
  env: { DB: D1Database }
}) {
  const { request, env } = context
  const { user } = await getSession(request, env.DB)
  if (!user) return error('请先登录', 401)

  let body: {
    type?: string
    severity?: string
    title?: string
    description?: string
    url?: string
    browser?: string
  }
  try {
    body = await request.json()
  } catch {
    return error('请求体格式错误')
  }

  const type = cleanText(body.type || 'bug', 20).trim()
  if (!VALID_TYPES.has(type)) {
    return error('类型只能是 bug / feature / ui / performance / security')
  }

  const severity = cleanText(body.severity || 'normal', 20).trim()
  if (!VALID_SEVERITY.has(severity)) {
    return error('严重程度只能是 low / normal / high / critical')
  }

  const title = cleanText(body.title || '', 200).trim()
  if (!title) return error('标题不能为空')
  if (title.length < 5) return error('标题至少需要 5 个字符')

  const description = cleanText(body.description || '', 5000).trim()
  if (!description) return error('描述不能为空')
  if (description.length < 10) return error('描述至少需要 10 个字符')

  const url = cleanText(body.url || '', 500).trim()
  const browser = cleanText(body.browser || '', 200).trim()

  try {
    const result = await env.DB
      .prepare(
        `INSERT INTO bugs (reporter_id, type, severity, title, description, url, browser)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(user.id, type, severity, title, description, url, browser)
      .run()

    return json({ success: true, id: result.meta.last_row_id }, 201)
  } catch (err) {
    return error('提交失败：' + String(err), 500)
  }
}

export async function onRequestGet(context: {
  request: Request
  env: { DB: D1Database }
}) {
  const { request, env } = context
  const { user } = await getSession(request, env.DB)
  if (!user) return error('请先登录', 401)
  if (user.role !== 'admin') return error('无权访问', 403)

  try {
    const result = await env.DB
      .prepare(
        `SELECT b.*, u.username AS reporter_username
         FROM bugs b
         LEFT JOIN users u ON b.reporter_id = u.id
         ORDER BY b.created_at DESC
         LIMIT 200`
      )
      .all()

    return json({ bugs: result.results })
  } catch (err) {
    return error('获取失败：' + String(err), 500)
  }
}

// PATCH → 更新 bug 状态（管理员）
export async function onRequestPatch(context: {
  request: Request
  env: { DB: D1Database }
}) {
  const { request, env } = context
  const { user } = await getSession(request, env.DB)
  if (!user) return error('请先登录', 401)
  if (user.role !== 'admin') return error('无权访问', 403)

  const url = new URL(request.url)
  const id = parseInt(url.searchParams.get('id') || '0', 10)
  if (!id) return error('缺少 id 参数')

  let body: { status?: string; admin_note?: string }
  try {
    body = await request.json()
  } catch {
    return error('请求体格式错误')
  }

  const validStatuses = new Set(['open', 'in_progress', 'resolved', 'closed'])
  const status = body.status?.trim()
  if (status && !validStatuses.has(status)) {
    return error('无效的状态值')
  }

  try {
    const updates: string[] = []
    const paramsArr: (string | number)[] = []

    if (status) {
      updates.push('status = ?')
      paramsArr.push(status)
    }
    if (body.admin_note !== undefined) {
      updates.push('admin_note = ?')
      paramsArr.push(cleanText(body.admin_note, 1000))
    }

    if (updates.length === 0) {
      return json({ success: true, message: '没有需要更新的字段' })
    }

    paramsArr.push(id)
    const sql = `UPDATE bugs SET ${updates.join(', ')} WHERE id = ?`
    await env.DB.prepare(sql).bind(...paramsArr).run()

    return json({ success: true })
  } catch (err) {
    return error('更新失败：' + String(err), 500)
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
