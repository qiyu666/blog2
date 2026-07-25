// CORS + JSON helpers shared across API routes

export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}

export function error(message: string, status = 400): Response {
  return json({ error: message }, status)
}

/** Generate a URL-friendly slug from a title */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** Ensure slug uniqueness by appending a number if needed */
export async function uniqueSlug(db: D1Database, slug: string, excludeId?: number): Promise<string> {
  let candidate = slug
  let n = 1
  while (true) {
    const query = excludeId
      ? 'SELECT id FROM posts WHERE slug = ? AND id != ?'
      : 'SELECT id FROM posts WHERE slug = ?'
    const params = excludeId ? [candidate, excludeId] : [candidate]
    const existing = await db.prepare(query).bind(...params).first()
    if (!existing) return candidate
    candidate = `${slug}-${++n}`
  }
}
