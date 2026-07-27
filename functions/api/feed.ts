// /api/feed
// GET → RSS 2.0 XML feed of the latest 20 published posts (no auth required)

import { error } from './_helpers'

function xmlEscape(s: string): string {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/** Convert a SQLite datetime string (UTC) to an RFC 822 date for RSS pubDate. */
function toRfc822(sqliteDate: string): string {
  // SQLite datetime('now') → "YYYY-MM-DD HH:MM:SS" (UTC). Normalize to ISO.
  const iso = sqliteDate.includes('T')
    ? sqliteDate
    : sqliteDate.replace(' ', 'T') + 'Z'
  const d = new Date(iso)
  return isNaN(d.getTime()) ? sqliteDate : d.toUTCString()
}

export async function onRequestGet(context: {
  request: Request
  env: { DB: D1Database }
}) {
  const { request, env } = context
  const origin = new URL(request.url).origin

  try {
    const result = await env.DB.prepare(
      `SELECT id, title, slug, excerpt, created_at
       FROM posts
       WHERE published = 1
       ORDER BY created_at DESC
       LIMIT 20`
    ).all<{ id: number; title: string; slug: string; excerpt: string; created_at: string }>()

    const items = result.results
      .map(p => {
        const link = `${origin}/post/${p.slug}`
        return `    <item>
      <title>${xmlEscape(p.title)}</title>
      <link>${xmlEscape(link)}</link>
      <description>${xmlEscape(p.excerpt || '')}</description>
      <pubDate>${toRfc822(p.created_at)}</pubDate>
      <guid>${xmlEscape(link)}</guid>
    </item>`
      })
      .join('\n')

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Marginalia</title>
    <link>${xmlEscape(origin)}</link>
    <description>Latest posts from Marginalia</description>
    <language>zh-CN</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${items}
  </channel>
</rss>`

    return new Response(xml, {
      status: 200,
      headers: {
        'Content-Type': 'application/rss+xml; charset=utf-8',
        'Cache-Control': 'public, max-age=600',
      },
    })
  } catch (err) {
    if (String(err).includes('no such table')) {
      // Return an empty-but-valid feed if the table does not exist yet.
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Marginalia</title>
    <link>${xmlEscape(origin)}</link>
    <description>Latest posts from Marginalia</description>
    <language>zh-CN</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
  </channel>
</rss>`
      return new Response(xml, {
        status: 200,
        headers: {
          'Content-Type': 'application/rss+xml; charset=utf-8',
          'Cache-Control': 'public, max-age=600',
        },
      })
    }
    return error('Failed to generate feed: ' + String(err), 500)
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
