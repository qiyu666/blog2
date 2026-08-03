// GET /api/admin/migrations
// 显示当前 D1 迁移状态，以及待执行的迁移列表。
import { json, error, requireAdmin } from '../_helpers'

const LATEST = 11

export async function onRequestGet(context: {
  request: Request
  env: { DB: D1Database }
}) {
  const auth = await requireAdmin(context.request, context.env.DB)
  if (auth instanceof Response) return auth

  // 查询当前版本
  const row = await context.env.DB.prepare('PRAGMA user_version').first<{ user_version: number }>()
  const current = row?.user_version ?? 0

  // 收集待执行的迁移
  const pending: { version: number; file: string }[] = []
  for (let v = current + 1; v <= LATEST; v++) {
    pending.push({ version: v, file: `schema-v${v}.sql` })
  }

  return json({
    current,
    latest: LATEST,
    pending,
    upToDate: pending.length === 0,
  })
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
