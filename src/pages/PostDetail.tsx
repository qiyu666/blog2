import { useEffect, useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import type { Post } from '../types'
import { getPost, deletePost } from '../api'

/** Minimal markdown → HTML renderer (headings, lists, code, blockquote, bold, italic) */
function renderMarkdown(md: string): string {
  const lines = md.split('\n')
  let html = ''
  let inList = false
  let inCode = false
  let codeBuffer: string[] = []

  function inline(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>')
  }

  for (const line of lines) {
    if (line.trim().startsWith('```')) {
      if (inCode) {
        html += `<pre><code>${codeBuffer.join('\n').replace(/</g, '&lt;')}</code></pre>\n`
        codeBuffer = []
        inCode = false
      } else {
        if (inList) { html += '</ul>\n'; inList = false }
        inCode = true
      }
      continue
    }
    if (inCode) {
      codeBuffer.push(line)
      continue
    }
    if (/^###\s/.test(line)) {
      if (inList) { html += '</ul>\n'; inList = false }
      html += `<h3>${inline(line.replace(/^###\s/, ''))}</h3>\n`
    } else if (/^##\s/.test(line)) {
      if (inList) { html += '</ul>\n'; inList = false }
      html += `<h2>${inline(line.replace(/^##\s/, ''))}</h2>\n`
    } else if (/^#\s/.test(line)) {
      if (inList) { html += '</ul>\n'; inList = false }
      html += `<h1>${inline(line.replace(/^#\s/, ''))}</h1>\n`
    } else if (/^>\s/.test(line)) {
      if (inList) { html += '</ul>\n'; inList = false }
      html += `<blockquote>${inline(line.replace(/^>\s/, ''))}</blockquote>\n`
    } else if (/^[-*]\s/.test(line)) {
      if (!inList) { html += '<ul>\n'; inList = true }
      html += `<li>${inline(line.replace(/^[-*]\s/, ''))}</li>\n`
    } else if (line.trim() === '') {
      if (inList) { html += '</ul>\n'; inList = false }
    } else {
      if (inList) { html += '</ul>\n'; inList = false }
      html += `<p>${inline(line)}</p>\n`
    }
  }
  if (inList) html += '</ul>\n'
  if (inCode) html += `<pre><code>${codeBuffer.join('\n').replace(/</g, '&lt;')}</code></pre>\n`
  return html
}

export default function PostDetail() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const [post, setPost] = useState<Post | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!slug) return
    setLoading(true)
    getPost(slug)
      .then(data => {
        setPost(data)
        setLoading(false)
      })
      .catch(err => {
        setError(err.message)
        setLoading(false)
      })
  }, [slug])

  async function handleDelete() {
    if (!post) return
    if (!confirm('Delete this post? This cannot be undone.')) return
    try {
      await deletePost(post.id)
      navigate('/')
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Delete failed')
    }
  }

  if (loading) return <div className="loading">Finding the piece</div>
  if (error || !post) return (
    <div className="error-state">
      <h2 className="error-state__title">Post not found</h2>
      <p className="error-state__msg">
        <Link to="/" style={{ color: 'var(--accent)' }}>← Back to the journal</Link>
      </p>
    </div>
  )

  const tags = post.tags.split(',').map(t => t.trim()).filter(Boolean)

  return (
    <article className="article">
      <div className="container-narrow">
        <Link to="/" className="back-link">← Back to the journal</Link>
      </div>
      <header className="article__header">
        <span className="article__category">{post.category}</span>
        <h1 className="article__title">{post.title}</h1>
        <div className="article__meta">
          <span className="article__author">{post.author}</span>
          <span>·</span>
          <span>{new Date(post.created_at + 'Z').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
          <span>·</span>
          <span>{post.views} views</span>
        </div>
      </header>
      {post.cover_image && (
        <div className="article__cover">
          <img src={post.cover_image} alt={post.title} />
        </div>
      )}
      <div
        className="article__body"
        dangerouslySetInnerHTML={{ __html: renderMarkdown(post.content) }}
      />
      <footer className="article__footer">
        <div className="article__tags">
          {tags.map(tag => (
            <span key={tag} className="tag">#{tag}</span>
          ))}
        </div>
        <div className="article__actions">
          <Link to={`/edit/${post.id}`} className="btn-edit">Edit</Link>
          <button onClick={handleDelete} className="btn-delete">Delete</button>
        </div>
      </footer>
    </article>
  )
}
