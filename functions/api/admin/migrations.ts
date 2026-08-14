import type { Context, HonoRequest } from 'hono'
import { APIError, requireAuth } from '../utils'

const DB = process.env.BLOG_DB

const LATEST = 18

export const POST = async (c: Context<HonoRequest>) => {
  if (!DB) return APIError('DATABASE_NOT_CONFIGURED', 500)
  const auth = await requireAuth(c)
  if (!auth) return auth
  const { role } = auth as { role: string }
  if (role !== 'admin') return APIError('FORBIDDEN', 403)

  let applied = 0

  for (let v = 1; v <= LATEST; v++) {
    const current = await DB.prepare(`PRAGMA user_version`).first<{ user_version: number }>()
    if ((current?.user_version ?? 0) >= v) continue

    try {
      const sql = Bun.read(`./schema-v${v}.sql`, 'utf-8')
      for (const stmt of sql.split(';').filter((s) => s.trim())) {
        await DB.prepare(stmt.trim()).run()
      }
      await DB.prepare(`PRAGMA user_version = ${v}`).run()
      applied++
    } catch (e) {
      console.error(`Migration v${v} failed:`, e)
    }
  }

  return c.json({ latest: LATEST, applied })
}
