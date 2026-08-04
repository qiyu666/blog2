// /api/admin/export
// GET → export all posts as JSON or Markdown (admin only)
//   ?format=json       → single JSON download (all fields)
//   ?format=markdown   → concatenated markdown files with YAML frontmatter

import { json, error } from '../_helpers'
import { getSession } from '../_auth'
import { enforceAdminRateLimit } from '../_rate-limit'

export async function onRequestGet(context: {
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

  const url = new URL(request.url)
  const format = (url.searchParams.get('format') || 'json').toLowerCase()

  try {
    const result = await env.DB
      .prepare(
        `SELECT p.*, u.username AS author_username
         FROM posts p
         LEFT JOIN users u ON p.author_id = u.id
         ORDER BY p.created_at ASC`
      )
      .all()
    const posts = result.results as any[]

    if (format === 'markdown' || format === 'md') {
      // 拼接所有文章为单个 Markdown 文档：每篇以 YAML frontmatter 头开始
      const parts: string[] = []
      for (const p of posts) {
        const tags = (p.tags || '')
          .split(',')
          .map((t: string) => t.trim())
          .filter(Boolean)
        const frontmatter: string[] = [
          '---',
          `title: ${yamlEscape(p.title || '')}`,
          `slug: ${yamlEscape(p.slug || '')}`,
          `category: ${yamlEscape(p.category || '')}`,
          `author: ${yamlEscape(p.author_username || p.author || '')}`,
          `created_at: ${p.created_at || ''}`,
          `updated_at: ${p.updated_at || ''}`,
          `published: ${p.published ?? 1}`,
          `views: ${p.views ?? 0}`,
        ]
        if (p.cover_image) frontmatter.push(`cover_image: ${yamlEscape(p.cover_image)}`)
        if (p.excerpt) frontmatter.push(`excerpt: ${yamlEscape(p.excerpt)}`)
        if (tags.length > 0) {
          frontmatter.push('tags:')
          for (const t of tags) frontmatter.push(`  - ${yamlEscape(t)}`)
        }
        frontmatter.push('---', '')
        parts.push(frontmatter.join('\n') + (p.content || ''))
      }
      const body = parts.join('\n\n---\n\n')
      const stamp = new Date().toISOString().slice(0, 10)
      return new Response(body, {
        status: 200,
        headers: {
          'Content-Type': 'text/markdown; charset=utf-8',
          'Content-Disposition': `attachment; filename="posts-${stamp}.md"`,
          'Access-Control-Allow-Origin': '*',
        },
      })
    }

    // 默认 JSON
    const body = JSON.stringify(
      {
        exported_at: new Date().toISOString(),
        count: posts.length,
        posts,
      },
      null,
      2,
    )
    const stamp = new Date().toISOString().slice(0, 10)
    return new Response(body, {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="posts-${stamp}.json"`,
        'Access-Control-Allow-Origin': '*',
      },
    })
  } catch (err) {
    return error('导出失败：' + String(err), 500)
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

// 简单 YAML 转义：含特殊字符的字符串用双引号包裹
function yamlEscape(s: string): string {
  if (s === undefined || s === null) return '""'
  const str = String(s)
  if (/[\n\r":#\-?,[\]{}&*!|>'"%@`]/.test(str) || str.trim() !== str || str === '') {
    return '"' + str.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n') + '"'
  }
  return str
}
