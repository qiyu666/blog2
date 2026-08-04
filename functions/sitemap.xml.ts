// GET /sitemap.xml
// Standard sitemap listing the homepage, static pages (archives, tags, links),
// and all published posts. Content-Type: application/xml.

import { error } from './api/_helpers'

function xmlEscape(s: string): string {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/** Convert a SQLite datetime string (UTC) to W3C Datetime for sitemap lastmod. */
function toW3C(sqliteDate: string): string {
  const iso = sqliteDate.includes('T')
    ? sqliteDate
    : sqliteDate.replace(' ', 'T') + 'Z'
  const d = new Date(iso)
  return isNaN(d.getTime()) ? sqliteDate : d.toISOString()
}

export async function onRequestGet(context: {
  request: Request
  env: { DB: D1Database }
}) {
  const { request, env } = context
  // Prefer the canonical production URL; fall back to the request origin so
  // previews and local dev still produce valid absolute URLs.
  const origin = new URL(request.url).origin
  const baseUrl = origin.includes('localhost') || origin.includes('pages.dev')
    ? 'https://marginalia.blog'
    : origin

  try {
    const postsResult = await env.DB
      .prepare(
        `SELECT slug, updated_at, created_at
         FROM posts
         WHERE published = 1
         ORDER BY created_at DESC`
      )
      .all<{ slug: string; updated_at: string; created_at: string }>()

    const staticUrls = [
      { loc: `${baseUrl}/`, priority: '1.0', changefreq: 'daily' },
      { loc: `${baseUrl}/archives`, priority: '0.6', changefreq: 'weekly' },
      { loc: `${baseUrl}/tags`, priority: '0.6', changefreq: 'weekly' },
      { loc: `${baseUrl}/links`, priority: '0.4', changefreq: 'monthly' },
    ]

    const postUrls = postsResult.results.map((p) => ({
      loc: `${baseUrl}/post/${encodeURIComponent(p.slug)}`,
      lastmod: toW3C(p.updated_at || p.created_at),
      priority: '0.8',
      changefreq: 'weekly',
    }))

    const allUrls = [...staticUrls, ...postUrls]

    const body = allUrls
      .map((u) => {
        const lastmod = u.lastmod
          ? `    <lastmod>${u.lastmod}</lastmod>\n`
          : ''
        return `  <url>
    <loc>${xmlEscape(u.loc)}</loc>
${lastmod}    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`
      })
      .join('\n')

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>`

    return new Response(xml, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=600',
      },
    })
  } catch (err) {
    if (String(err).includes('no such table')) {
      // Return a minimal valid sitemap if the DB isn't initialized yet.
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${xmlEscape(baseUrl)}/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>`
      return new Response(xml, {
        status: 200,
        headers: {
          'Content-Type': 'application/xml; charset=utf-8',
          'Cache-Control': 'public, max-age=600',
        },
      })
    }
    return error('Failed to generate sitemap: ' + String(err), 500)
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
