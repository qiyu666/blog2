import { useEffect, useState, useCallback, FormEvent } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import type { Post, Comment } from '../types'
import {
  getPost,
  deletePost,
  getComments,
  createComment,
  deleteComment,
  getLikeStatus,
  toggleLike,
  toggleFavorite,
} from '../api'
import { useAuth } from '../auth/AuthContext'

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

function formatRelative(dateStr: string): string {
  const d = new Date(dateStr + 'Z')
  const now = Date.now()
  const diff = now - d.getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return '刚刚'
  if (min < 60) return `${min} 分钟前`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr} 小时前`
  const day = Math.floor(hr / 24)
  if (day < 30) return `${day} 天前`
  return d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
}

export default function PostDetail() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [post, setPost] = useState<Post | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [comments, setComments] = useState<Comment[]>([])
  const [commentText, setCommentText] = useState('')
  const [replyTo, setReplyTo] = useState<number | null>(null)
  const [replyText, setReplyText] = useState('')
  const [commentError, setCommentError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const [likeCount, setLikeCount] = useState(0)
  const [liked, setLiked] = useState(false)
  const [likeBusy, setLikeBusy] = useState(false)

  const [favorited, setFavorited] = useState(false)
  const [favBusy, setFavBusy] = useState(false)

  const loadPost = useCallback(() => {
    if (!slug) return
    setLoading(true)
    getPost(slug)
      .then((data) => {
        setPost(data)
        setLoading(false)
      })
      .catch((err) => {
        setError(err.message)
        setLoading(false)
      })
  }, [slug])

  const loadComments = useCallback(() => {
    if (!slug) return
    getComments(slug)
      .then(setComments)
      .catch(() => {})
  }, [slug])

  const loadLikeStatus = useCallback(() => {
    if (!slug) return
    getLikeStatus(slug)
      .then((s) => {
        setLikeCount(s.count)
        setLiked(s.liked)
      })
      .catch(() => {})
  }, [slug])

  useEffect(() => {
    loadPost()
  }, [loadPost])

  useEffect(() => {
    loadComments()
    loadLikeStatus()
  }, [loadComments, loadLikeStatus])

  async function handleDelete() {
    if (!post) return
    if (!confirm('确认删除这篇帖子？此操作不可撤销。')) return
    try {
      await deletePost(post.id)
      navigate('/')
    } catch (err) {
      alert(err instanceof Error ? err.message : '删除失败')
    }
  }

  async function handleToggleLike() {
    if (!post || !user) {
      navigate('/login?redirect=' + encodeURIComponent(`/post/${slug}`))
      return
    }
    if (likeBusy) return
    setLikeBusy(true)
    const prevLiked = liked
    const prevCount = likeCount
    // Optimistic update
    setLiked(!prevLiked)
    setLikeCount(prevCount + (prevLiked ? -1 : 1))
    try {
      const res = await toggleLike(post.slug)
      setLiked(res.liked)
      // Re-fetch accurate count
      loadLikeStatus()
    } catch (err) {
      setLiked(prevLiked)
      setLikeCount(prevCount)
      alert(err instanceof Error ? err.message : '操作失败')
    } finally {
      setLikeBusy(false)
    }
  }

  async function handleToggleFavorite() {
    if (!post || !user) {
      navigate('/login?redirect=' + encodeURIComponent(`/post/${slug}`))
      return
    }
    if (favBusy) return
    setFavBusy(true)
    const prev = favorited
    setFavorited(!prev)
    try {
      const res = await toggleFavorite(post.slug)
      setFavorited(res.favorited)
    } catch (err) {
      setFavorited(prev)
      alert(err instanceof Error ? err.message : '操作失败')
    } finally {
      setFavBusy(false)
    }
  }

  async function handleSubmitComment(e: FormEvent) {
    e.preventDefault()
    if (!post || !user) return
    const content = commentText.trim()
    if (!content) return
    setSubmitting(true)
    setCommentError('')
    try {
      const created = await createComment(post.slug, content, null)
      setComments((prev) => [...prev, created])
      setCommentText('')
    } catch (err) {
      setCommentError(err instanceof Error ? err.message : '评论失败')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleSubmitReply(parentId: number) {
    if (!post || !user) return
    const content = replyText.trim()
    if (!content) return
    try {
      const created = await createComment(post.slug, content, parentId)
      setComments((prev) => [...prev, created])
      setReplyText('')
      setReplyTo(null)
    } catch (err) {
      alert(err instanceof Error ? err.message : '回复失败')
    }
  }

  async function handleDeleteComment(id: number) {
    if (!confirm('删除这条评论？')) return
    try {
      await deleteComment(id)
      setComments((prev) => prev.filter((c) => c.id !== id && c.parent_id !== id))
    } catch (err) {
      alert(err instanceof Error ? err.message : '删除失败')
    }
  }

  if (loading) return <div className="loading">加载中</div>
  if (error || !post)
    return (
      <div className="error-state">
        <h2 className="error-state__title">未找到帖子</h2>
        <p className="error-state__msg">
          <Link to="/" style={{ color: 'var(--accent)' }}>
            ← 返回论坛
          </Link>
        </p>
      </div>
    )

  const tags = post.tags
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)
  const author = post.author_username || post.author || '匿名'
  const canEdit = user && (post.author_id === user.id || user.role === 'admin')

  // Build threaded comments
  const topLevel = comments.filter((c) => !c.parent_id)
  const repliesOf = (id: number) => comments.filter((c) => c.parent_id === id)

  function renderComment(c: Comment) {
    const isMine = user && c.user_id === user.id
    const canDel = isMine || user?.role === 'admin'
    const kids = repliesOf(c.id)
    return (
      <li key={c.id} className="comment">
        <div className="comment__avatar">
          {c.author_avatar ? (
            <img src={c.author_avatar} alt={c.author_username} />
          ) : (
            <span className="comment__avatar-fallback">
              {c.author_username.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
        <div className="comment__body">
          <div className="comment__head">
            <span className="comment__author">@{c.author_username}</span>
            <span className="comment__time">{formatRelative(c.created_at)}</span>
          </div>
          <p className="comment__content">{c.content}</p>
          <div className="comment__actions">
            {user && (
              <button
                type="button"
                className="comment__action"
                onClick={() => {
                  setReplyTo(replyTo === c.id ? null : c.id)
                  setReplyText('')
                }}
              >
                回复
              </button>
            )}
            {canDel && (
              <button
                type="button"
                className="comment__action comment__action--danger"
                onClick={() => handleDeleteComment(c.id)}
              >
                删除
              </button>
            )}
          </div>
          {replyTo === c.id && (
            <div className="reply-box">
              <textarea
                className="form__textarea"
                rows={2}
                placeholder={`回复 @${c.author_username}…`}
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
              />
              <div className="reply-box__actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    setReplyTo(null)
                    setReplyText('')
                  }}
                >
                  取消
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => handleSubmitReply(c.id)}
                  disabled={!replyText.trim()}
                >
                  回复
                </button>
              </div>
            </div>
          )}
          {kids.length > 0 && (
            <ul className="comment__replies">{kids.map(renderComment)}</ul>
          )}
        </div>
      </li>
    )
  }

  return (
    <article className="article">
      <div className="container-narrow">
        <Link to="/" className="back-link">
          ← 返回论坛
        </Link>
      </div>
      <header className="article__header">
        <span className="article__category">{post.category}</span>
        <h1 className="article__title">{post.title}</h1>
        <div className="article__meta">
          <span className="article__author">@{author}</span>
          <span>·</span>
          <span>
            {new Date(post.created_at + 'Z').toLocaleDateString('zh-CN', {
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })}
          </span>
          <span>·</span>
          <span>{post.views} 次浏览</span>
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
          {tags.map((tag) => (
            <span key={tag} className="tag">
              #{tag}
            </span>
          ))}
        </div>
        <div className="article__actions article__actions--forum">
          <button
            type="button"
            className={`action-btn ${liked ? 'action-btn--active' : ''}`}
            onClick={handleToggleLike}
            disabled={likeBusy}
            title={user ? '点赞' : '登录后点赞'}
          >
            <span className="action-btn__icon">{liked ? '♥' : '♡'}</span>
            <span className="action-btn__count">{likeCount}</span>
          </button>
          <button
            type="button"
            className={`action-btn ${favorited ? 'action-btn--active' : ''}`}
            onClick={handleToggleFavorite}
            disabled={favBusy}
            title={user ? '收藏' : '登录后收藏'}
          >
            <span className="action-btn__icon">{favorited ? '★' : '☆'}</span>
            <span className="action-btn__count">{favorited ? '已收藏' : '收藏'}</span>
          </button>
          {canEdit && (
            <>
              <Link to={`/edit/${post.id}`} className="btn-edit">
                编辑
              </Link>
              <button onClick={handleDelete} className="btn-delete">
                删除
              </button>
            </>
          )}
        </div>
      </footer>

      {/* Comments section */}
      <section className="comments" id="comments">
        <h2 className="comments__title">
          评论 <span className="comments__count">{comments.length}</span>
        </h2>

        {user ? (
          <form className="comment-form" onSubmit={handleSubmitComment}>
            {commentError && <div className="form__error">{commentError}</div>}
            <textarea
              className="form__textarea"
              rows={3}
              placeholder="写下你的看法…"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              required
            />
            <div className="comment-form__actions">
              <button
                type="submit"
                className="btn-primary"
                disabled={submitting || !commentText.trim()}
              >
                {submitting ? '发布中…' : '发布评论'}
              </button>
            </div>
          </form>
        ) : (
          <div className="comments__login-hint">
            <Link to={`/login?redirect=${encodeURIComponent(`/post/${slug}`)}`}>
              登录
            </Link>
            后参与评论。
          </div>
        )}

        {comments.length === 0 ? (
          <p className="comments__empty">还没有评论，成为第一个发言的人。</p>
        ) : (
          <ul className="comment-list">{topLevel.map(renderComment)}</ul>
        )}
      </section>
    </article>
  )
}
