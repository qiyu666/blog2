import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import Prism from 'prismjs'
import 'prismjs/components/prism-javascript'
import 'prismjs/components/prism-typescript'
import 'prismjs/components/prism-python'
import 'prismjs/components/prism-bash'
import 'prismjs/components/prism-css'
import 'prismjs/components/prism-json'
import 'prismjs/components/prism-sql'
import 'prismjs/components/prism-markup'
import 'prismjs/components/prism-java'
import 'prismjs/components/prism-c'
import 'prismjs/components/prism-cpp'
import 'prismjs/components/prism-go'
import 'prismjs/components/prism-rust'
import 'prismjs/components/prism-yaml'
import 'prismjs/components/prism-markdown'
import type { Post } from '../types'
import { getSharedPostByToken } from '../api'
import { renderMarkdown } from './PostDetail'
import SEO from '../components/SEO'

export default function SharedPost() {
  const { token } = useParams<{ token: string }>()
  const [post, setPost] = useState<Post | null>(null)
  const [expiresAt, setExpiresAt] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!token) return
    setLoading(true)
    setError('')
    getSharedPostByToken(token)
      .then((data) => {
        setPost(data.post)
        setExpiresAt(data.expires_at)
        setLoading(false)
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : '加载失败')
        setLoading(false)
      })
  }, [token])

  useEffect(() => {
    if (!post) return
    Prism.highlightAll()
  }, [post])

  if (loading) return <div className="loading">加载中</div>

  if (error || !post) {
    return (
      <div className="error-state">
        <h2 className="error-state__title">无法访问</h2>
        <p className="error-state__msg">{error || '分享链接无效或已失效'}</p>
        <p className="error-state__msg">
          <Link to="/" style={{ color: 'var(--accent)' }}>
            ← 返回首页
          </Link>
        </p>
      </div>
    )
  }

  const author = post.author_username || post.author || '匿名'
  const tags = post.tags
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)

  const expiryText = expiresAt
    ? new Date(expiresAt.replace(' ', 'T') + 'Z').toLocaleString('zh-CN')
    : ''

  return (
    <>
      <div className="share-preview-banner" role="status">
        <span className="share-preview-banner__icon">🔒</span>
        <span className="share-preview-banner__text">
          这是一篇草稿预览，仅持有此链接的人可读。文章尚未公开发布。
        </span>
        {expiryText && (
          <span className="share-preview-banner__expiry">链接有效期至：{expiryText}</span>
        )}
      </div>

      <div className="post-layout">
        <div className="post-main">
          <article className="article">
            <SEO
              title={post.title}
              description={post.excerpt || post.content.slice(0, 150)}
              type="article"
            />
            <div className="article__back-link-wrap">
              <Link to="/" className="back-link">
                ← 返回首页
              </Link>
            </div>

            <header className="article__header">
              <span className="article__category">{post.category}</span>
              <h1 className="article__title">{post.title}</h1>
              {post.excerpt && <p className="article__excerpt">{post.excerpt}</p>}
              <div className="article__meta">
                <span className="article__author"> @{author}</span>
                <span className="article__meta-divider">·</span>
                <span>
                  {new Date(post.created_at + 'Z').toLocaleDateString('zh-CN', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </span>
                <span className="article__meta-divider">·</span>
                <span>{post.views} 次浏览</span>
              </div>
            </header>

            {post.cover_image && (
              <div className="article__cover">
                <img src={post.cover_image} alt={post.title} loading="lazy" width={1200} height={630} />
              </div>
            )}

            <div className="article__divider">
              <div className="article__divider-line">
                <span className="article__divider-ornament">§</span>
              </div>
            </div>

            <div
              className="article__body"
              dangerouslySetInnerHTML={{ __html: renderMarkdown(post.content) }}
            />

            {tags.length > 0 && (
              <footer className="article__footer">
                <div className="article__footer-tags">
                  <span className="article__footer-tags-label">标签</span>
                  <div className="article__tags">
                    {tags.map((tag) => (
                      <span key={tag} className="tag">#{tag}</span>
                    ))}
                  </div>
                </div>
              </footer>
            )}
          </article>
        </div>
      </div>
    </>
  )
}
