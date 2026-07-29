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
  toggleCommentLike,
  reportTarget,
} from '../api'
import { useAuth } from '../auth/AuthContext'
import SEO from '../components/SEO'
import PostSidebar from '../components/PostSidebar'

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
    if (/^#####\s/.test(line)) {
      if (inList) { html += '</ul>\n'; inList = false }
      html += `<h5>${inline(line.replace(/^#####\s/, ''))}</h5>\n`
    } else if (/^####\s/.test(line)) {
      if (inList) { html += '</ul>\n'; inList = false }
      html += `<h4>${inline(line.replace(/^####\s/, ''))}</h4>\n`
    } else if (/^###\s/.test(line)) {
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

/** Render comment content, converting @username mentions into clickable Links. */
function renderCommentContent(content: string) {
  const parts = content.split(/(@[a-zA-Z0-9_]{3,20})/g)
  return parts.map((part, i) => {
    if (part.startsWith('@') && part.length > 1) {
      const username = part.slice(1)
      return (
        <Link key={i} to={`/${username}`} className="mention">
          {part}
        </Link>
      )
    }
    return <span key={i}>{part}</span>
  })
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
  const [commentLikeBusy, setCommentLikeBusy] = useState<Record<number, boolean>>({})

  const [likeCount, setLikeCount] = useState(0)
  const [liked, setLiked] = useState(false)
  const [likeBusy, setLikeBusy] = useState(false)

  const [favorited, setFavorited] = useState(false)
  const [favBusy, setFavBusy] = useState(false)
  const [reportBusy, setReportBusy] = useState(false)

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

  // 执行文章自定义脚本
  useEffect(() => {
    if (!post?.custom_js) return

    // 检测是否是音乐播放器配置（JSON 格式）
    const musicMatch = post.custom_js.match(/\/\*MUSIC_PLAYER\*\/([\s\S]*?)(?:\/\*END\*\/|$)/)
    if (musicMatch) {
      try {
        const playlist = JSON.parse(musicMatch[1].trim())
        if (Array.isArray(playlist) && playlist.length > 0) {
          window.dispatchEvent(new CustomEvent('music:set-playlist', { detail: { playlist } }))
          return
        }
      } catch (e) {
        console.warn('[music] 配置解析失败:', e)
      }
    }

    // 普通自定义 JS，正常执行
    try {
      const script = document.createElement('script')
      script.textContent = post.custom_js
      script.dataset.customJs = String(post.id)
      document.body.appendChild(script)
      return () => {
        script.remove()
      }
    } catch (err) {
      console.warn('[custom_js] 执行出错:', err)
    }
  }, [post?.id])

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

  async function handleReport() {
    if (!post) return
    if (!user) {
      navigate('/login?redirect=' + encodeURIComponent(`/post/${slug}`))
      return
    }
    // 不允许举报自己的帖子
    if (post.author_id && user.id === post.author_id) {
      alert('不能举报自己的帖子')
      return
    }
    const reason = window.prompt('请输入举报理由（必填）：')
    if (reason === null) return
    const trimmed = reason.trim()
    if (!trimmed) {
      alert('举报理由不能为空')
      return
    }
    if (reportBusy) return
    setReportBusy(true)
    try {
      await reportTarget('post', post.id, trimmed)
      alert('举报已提交，管理员会尽快处理。')
    } catch (err) {
      alert(err instanceof Error ? err.message : '举报失败')
    } finally {
      setReportBusy(false)
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

  async function handleToggleCommentLike(commentId: number) {
    if (!user) {
      navigate('/login?redirect=' + encodeURIComponent(`/post/${slug}`))
      return
    }
    if (commentLikeBusy[commentId]) return
    setCommentLikeBusy((prev) => ({ ...prev, [commentId]: true }))
    // Find current state for optimistic update
    const target = comments.find((c) => c.id === commentId)
    if (!target) {
      setCommentLikeBusy((prev) => ({ ...prev, [commentId]: false }))
      return
    }
    const prevLiked = !!target.liked
    const prevCount = target.likes_count ?? 0
    // Optimistic update
    setComments((prev) =>
      prev.map((c) =>
        c.id === commentId
          ? {
              ...c,
              liked: !prevLiked,
              likes_count: Math.max(0, prevCount + (prevLiked ? -1 : 1)),
            }
          : c
      )
    )
    try {
      const res = await toggleCommentLike(commentId)
      // Apply server-returned liked state, keep optimistic count (will be corrected on next reload)
      setComments((prev) =>
        prev.map((c) =>
          c.id === commentId
            ? {
                ...c,
                liked: res.liked,
                likes_count: Math.max(0, prevCount + (res.liked ? 1 : -1)),
              }
            : c
        )
      )
    } catch (err) {
      // Revert on error
      setComments((prev) =>
        prev.map((c) =>
          c.id === commentId
            ? { ...c, liked: prevLiked, likes_count: prevCount }
            : c
        )
      )
      alert(err instanceof Error ? err.message : '操作失败')
    } finally {
      setCommentLikeBusy((prev) => ({ ...prev, [commentId]: false }))
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
    const cLiked = !!c.liked
    const cLikesCount = c.likes_count ?? 0
    const cBusy = !!commentLikeBusy[c.id]
    return (
      <li key={c.id} className="comment">
        <Link to={`/${c.author_username}`} className="comment__avatar">
          {c.author_avatar ? (
            <img src={c.author_avatar} alt={c.author_username} />
          ) : (
            <span className="comment__avatar-fallback">
              {c.author_username.charAt(0).toUpperCase()}
            </span>
          )}
        </Link>
        <div className="comment__body">
          <div className="comment__bubble">
            <div className="comment__head">
              <Link to={`/${c.author_username}`} className="comment__author">
                @{c.author_username}
              </Link>
              <span className="comment__time">{formatRelative(c.created_at)}</span>
            </div>
            <p className="comment__content">{renderCommentContent(c.content)}</p>
          </div>
          <div className="comment__actions">
            <button
              type="button"
              className={`comment__like ${cLiked ? 'comment__like--active' : ''}`}
              onClick={() => handleToggleCommentLike(c.id)}
              disabled={cBusy}
              title={user ? '点赞' : '登录后点赞'}
            >
              <span className="comment__like-icon">{cLiked ? '♥' : '♡'}</span>
              <span className="comment__like-count">{cLikesCount}</span>
            </button>
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

  const authorAvatar = post.author_avatar || ''

  return (
    <div className="post-layout">
      <PostSidebar post={post} />
      <article className="article">
        <SEO
          title={post.title}
          description={post.excerpt || post.content.slice(0, 150)}
          type="article"
        />
        <div className="article__back-link-wrap">
          <Link to="/" className="back-link">
            ← 返回论坛
          </Link>
        </div>

        <header className="article__header">
          <span className="article__category">{post.category}</span>
          <h1 className="article__title">{post.title}</h1>
          {post.excerpt && <p className="article__excerpt">{post.excerpt}</p>}
          <div className="article__meta">
            <span className="article__author">
              {authorAvatar && (
                <span className="article__author-avatar">
                  <img src={authorAvatar} alt={author} />
                </span>
              )}
              @{author}
            </span>
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
            <span className="article__meta-divider">·</span>
            <span>{Math.ceil(post.content.length / 500)} 分钟阅读</span>
          </div>
        </header>

        {post.cover_image && (
          <div className="article__cover">
            <img src={post.cover_image} alt={post.title} />
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

        <footer className="article__footer">
          {tags.length > 0 && (
            <div className="article__footer-tags">
              <span className="article__footer-tags-label">标签</span>
              <div className="article__tags">
                {tags.map((tag) => (
                  <span key={tag} className="tag">
                  #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}
          <div className="article__actions-wrap">
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
              <button
                type="button"
                className="action-btn action-btn--report"
                onClick={handleReport}
                disabled={reportBusy}
                title={user ? '举报这篇帖子' : '登录后举报'}
              >
                <span className="action-btn__icon">⚑</span>
                <span className="action-btn__count">{reportBusy ? '提交中…' : '举报'}</span>
              </button>
            </div>
            {canEdit && (
              <div style={{ display: 'flex', gap: 'var(--space-xs)' }}>
                <Link to={`/edit/${post.id}`} className="btn-edit">
                  编辑
                </Link>
                <button onClick={handleDelete} className="btn-delete">
                  删除
                </button>
              </div>
            )}
          </div>
        </footer>

        {/* Comments section */}
        <section className="comments" id="comments">
          <div className="comments__header">
            <h2 className="comments__title">
              对话
            </h2>
            <span className="comments__count">{comments.length} 条评论</span>
          </div>

          {user ? (
            <form className="comment-form" onSubmit={handleSubmitComment}>
              {commentError && <div className="form__error">{commentError}</div>}
              <textarea
                className="comment-form__textarea"
                rows={3}
                placeholder="分享你的想法…"
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
              后参与讨论。
            </div>
          )}

          {comments.length === 0 ? (
            <p className="comments__empty">还没有评论，成为第一个发言的人。</p>
          ) : (
            <ul className="comment-list">{topLevel.map(renderComment)}</ul>
          )}
        </section>
      </article>
    </div>
  )
}
