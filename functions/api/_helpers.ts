// CORS + JSON helpers shared across API routes

export function json(data: unknown, status = 200, extraHeaders: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      ...extraHeaders,
    },
  })
}

export function error(message: string, status = 400): Response {
  return json({ error: message }, status)
}

/** 公共只读端点的 CDN 缓存策略：
 *  - public：允许 CDN 和浏览器共享缓存
 *  - max-age：浏览器短缓存（秒），过期后仍可用 stale
 *  - s-maxage：CDN 边缘缓存时间（秒），比浏览器长
 *  - stale-while-revalidate：后台异步刷新，不影响响应速度
 */
export function withCache(resp: Response, opts: {
  browserMaxAge?: number
  cdnMaxAge?: number
  swr?: number
} = {}): Response {
  const browserMaxAge = opts.browserMaxAge ?? 30
  const cdnMaxAge = opts.cdnMaxAge ?? 600
  const swr = opts.swr ?? 300
  const cacheControl = `public, max-age=${browserMaxAge}, s-maxage=${cdnMaxAge}, stale-while-revalidate=${swr}`
  const headers = new Headers(resp.headers)
  headers.set('Cache-Control', cacheControl)
  headers.set('Vary', 'Accept-Encoding')
  return new Response(resp.body, {
    status: resp.status,
    statusText: resp.statusText,
    headers,
  })
}

/** 生成一个带 CDN 缓存的 JSON 响应 */
export function cachedJson(data: unknown, opts: {
  browserMaxAge?: number
  cdnMaxAge?: number
  swr?: number
} = {}): Response {
  return withCache(json(data), opts)
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
