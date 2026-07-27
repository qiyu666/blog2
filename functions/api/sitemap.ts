// /api/sitemap
// GET → sitemap.xml listing all published posts, public user profiles,
//       and the static pages (home). Content-Type: application/xml.

import { error } from './_helpers'

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
  const origin = new URL(request.url).origin

  try {
    // Run all three lookups in parallel for lower latency.
    const [postsResult, usersResult] = await Promise.all([
      env.DB
        .prepare(
          `SELECT slug, updated_at, created_at
           FROM posts
           WHERE published = 1
           ORDER BY created_at DESC`
        )
        .all<{ slug: string; updated_at: string; created_at: string }>(),
      env.DB
        .prepare(
          `SELECT DISTINCT u.username
           FROM users u
           INNER JOIN posts p ON p.author_id = u.id
           WHERE p.published = 1
           ORDER BY u.username ASC`
        )
        .all<{ username: string }>(),
    ])

    const staticUrls = [
      { loc: `${origin}/`, priority: '1.0', changefreq: 'daily' },
    ]

    const postUrls = postsResult.results.map((p) => ({
      loc: `${origin}/post/${encodeURIComponent(p.slug)}`,
      lastmod: toW3C(p.updated_at || p.created_at),
      priority: '0.8',
      changefreq: 'weekly',
    }))

    const userUrls = usersResult.results.map((u) => ({
      loc: `${origin}/${encodeURIComponent(u.username)}`,
      priority: '0.5',
      changefreq: 'weekly',
    }))

    const allUrls = [...staticUrls, ...postUrls, ...userUrls]

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
    <loc>${xmlEscape(origin)}/</loc>
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
