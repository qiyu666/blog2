// GET /feed.xml
// RSS 2.0 feed for published posts, consumed by feed readers.

export async function onRequestGet(context: { env: { DB: D1Database } }) {
  const posts = await context.env.DB
    .prepare(
      `SELECT slug, title, excerpt, content, created_at, author_username
       FROM posts
       WHERE published = 1
       ORDER BY created_at DESC
       LIMIT 20`
    )
    .all<{ slug: string; title: string; excerpt: string; content: string; created_at: string; author_username: string }>()

  const siteUrl = 'https://blog2.pages.dev'
  const items = posts.results.map((p) => `    <item>
      <title><![CDATA[${p.title}]]></title>
      <link>${siteUrl}/post/${p.slug}</link>
      <guid isPermaLink="false">${p.slug}</guid>
      <pubDate>${new Date(p.created_at + 'Z').toUTCString()}</pubDate>
      <description><![CDATA[${p.excerpt || p.content.slice(0, 200)}]]></description>
      <author>${p.author_username}</author>
    </item>`).join('\n')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Marginalia</title>
    <link>${siteUrl}</link>
    <description>Marginalia — 慢思随笔</description>
    <language>zh-CN</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${items}
  </channel>
</rss>`

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
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
