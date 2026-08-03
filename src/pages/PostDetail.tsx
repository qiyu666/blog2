import { useEffect, useState, useCallback, FormEvent } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
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
import type { Post, Comment } from '../types'
import {
  getPost,
  getPostNeighbors,
  deletePost,
  getComments,
  createComment,
  deleteComment,
  editComment,
  getLikeStatus,
  toggleLike,
  toggleFavorite,
  toggleCommentLike,
  reportTarget,
  searchUsers,
  getUserProfile,
} from '../api'
import type { PostNeighbor } from '../api'
import { useAuth } from '../auth/AuthContext'
import { useReadingHistory } from '../hooks/useReadingHistory'
import SEO from '../components/SEO'
import PostSidebar from '../components/PostSidebar'
import TableOfContents from '../components/TableOfContents'
import SocialLinks from '../components/SocialLinks'
import DOMPurify from 'dompurify'

/** Minimal markdown → HTML renderer (headings, lists, code, blockquote, bold, italic) */
function renderMarkdown(md: string): string {
  const lines = md.split('\n')
  let html = ''
  let inList = false
  let inCode = false
  let codeBuffer: string[] = []
  let codeLang = ''
  const slugCounter = new Map<string, number>()

  // 为标题生成稳定的 slug 锚点，重名时自动追加 -2 -3
  function headingId(text: string): string {
    const base = text
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s-]/gu, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      || 'section'
    const n = (slugCounter.get(base) || 0) + 1
    slugCounter.set(base, n)
    return n === 1 ? base : `${base}-${n}`
  }

  // 把 inline() 产生的 HTML 还原为纯文本，供 headingId 使用
  function stripInline(html: string): string {
    return html
      .replace(/<[^>]+>/g, '')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
  }

  function inline(text: string): string {
    // 第 1 步：先提取 Markdown 链接和图片（避免 &< > 转义破坏 URL）
    const placeholders: string[] = []
    const stash = (html: string) => {
      placeholders.push(html)
      return `\x00PLACEHOLDER_${placeholders.length - 1}\x00`
    }
    let processed = text
      // ![alt](url)
      .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_, alt, url) =>
        stash(`<img src="${url}" alt="${alt}" loading="lazy" style="max-width:100%;border-radius:8px;margin:0.5rem 0;" />`),
      )
      // [text](url)
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, url) =>
        stash(`<a href="${url}" target="_blank" rel="noreferrer noopener">${label}</a>`),
      )
    // 第 2 步：转义剩余的 HTML 特殊字符和行内格式
    processed = processed
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    // 第 3 步：还原占位符
    processed = processed.replace(
      /\x00PLACEHOLDER_(\d+)\x00/g,
      (_, i) => placeholders[Number(i)] ?? '',
    )
    return processed
  }

  for (const line of lines) {
    if (line.trim().startsWith('```')) {
      if (inCode) {
        html += `<pre class="code-block"><code class="language-${codeLang || 'text'}">${codeBuffer.join('\n').replace(/</g, '&lt;')}</code></pre>\n`
        codeBuffer = []
        inCode = false
        codeLang = ''
      } else {
        if (inList) { html += '</ul>\n'; inList = false }
        codeLang = line.trim().replace(/^```/, '').trim()
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
      const raw = line.replace(/^#####\s/, '')
      const t = inline(raw)
      html += `<h5 id="${headingId(stripInline(t))}">${t}</h5>\n`
    } else if (/^####\s/.test(line)) {
      if (inList) { html += '</ul>\n'; inList = false }
      const raw = line.replace(/^####\s/, '')
      const t = inline(raw)
      html += `<h4 id="${headingId(stripInline(t))}">${t}</h4>\n`
    } else if (/^###\s/.test(line)) {
      if (inList) { html += '</ul>\n'; inList = false }
      const raw = line.replace(/^###\s/, '')
      const t = inline(raw)
      html += `<h3 id="${headingId(stripInline(t))}">${t}</h3>\n`
    } else if (/^##\s/.test(line)) {
      if (inList) { html += '</ul>\n'; inList = false }
      const raw = line.replace(/^##\s/, '')
      const t = inline(raw)
      html += `<h2 id="${headingId(stripInline(t))}">${t}</h2>\n`
    } else if (/^#\s/.test(line)) {
      if (inList) { html += '</ul>\n'; inList = false }
      const raw = line.replace(/^#\s/, '')
      const t = inline(raw)
      html += `<h1 id="${headingId(stripInline(t))}">${t}</h1>\n`
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
  if (inCode) html += `<pre class="code-block"><code class="language-${codeLang || 'text'}">${codeBuffer.join('\n').replace(/</g, '&lt;')}</code></pre>\n`
  // 用 DOMPurify 过滤 XSS：移除 javascript: 协议链接、事件处理器等危险内容
  return DOMPurify.sanitize(html, { ADD_ATTR: ['target', 'rel'] })
}

/** 从 markdown 内容提取标题，用于生成 TOC */
function extractToc(md: string): Array<{ level: number; text: string; id: string }> {
  const slugCounter = new Map<string, number>()
  function headingId(text: string): string {
    const base = text
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s-]/gu, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      || 'section'
    const n = (slugCounter.get(base) || 0) + 1
    slugCounter.set(base, n)
    return n === 1 ? base : `${base}-${n}`
  }
  const toc: Array<{ level: number; text: string; id: string }> = []
  const lines = md.split('\n')
  let inCode = false
  for (const line of lines) {
    if (line.trim().startsWith('```')) { inCode = !inCode; continue }
    if (inCode) continue
    const m = /^(#{1,5})\s+(.*)$/.exec(line)
    if (m) {
      const level = m[1].length
      // 去除行内 markdown 标记
      const text = m[2]
        .replace(/\*\*([^*]+)\*\*/g, '$1')
        .replace(/\*([^*]+)\*/g, '$1')
        .replace(/`([^`]+)`/g, '$1')
        .trim()
      toc.push({ level, text, id: headingId(text) })
    }
  }
  return toc
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
  const [toc, setToc] = useState<Array<{ level: number; text: string; id: string }>>([])

  const [comments, setComments] = useState<Comment[]>([])
  const [commentText, setCommentText] = useState('')
  const [replyTo, setReplyTo] = useState<number | null>(null)
  const [replyText, setReplyText] = useState('')
  const [commentError, setCommentError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [commentLikeBusy, setCommentLikeBusy] = useState<Record<number, boolean>>({})
  const [visibleComments, setVisibleComments] = useState(10)
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null)
  const [editText, setEditText] = useState('')
  const [editBusy, setEditBusy] = useState(false)
  // 评论折叠：记录被折叠的评论 id
  const [collapsedComments, setCollapsedComments] = useState<Set<number>>(new Set())

  const { recordVisit, updateProgress } = useReadingHistory()

  const [likeCount, setLikeCount] = useState(0)
  const [liked, setLiked] = useState(false)
  const [likeBusy, setLikeBusy] = useState(false)

  const [favorited, setFavorited] = useState(false)
  const [favBusy, setFavBusy] = useState(false)
  const [reportBusy, setReportBusy] = useState(false)

  const [readProgress, setReadProgress] = useState(0)

  const [authorProfile, setAuthorProfile] = useState<{
    social_github?: string
    social_twitter?: string
    social_qq?: string
    social_wechat?: string
    social_telegram?: string
    social_bilibili?: string
    social_email?: string
  } | null>(null)

  const [mentionQuery, setMentionQuery] = useState('')
  const [mentionResults, setMentionResults] = useState<Array<{ id: number; username: string; display_name: string | null; avatar: string | null }>>([])
  const [mentionIndex, setMentionIndex] = useState(-1)
  const [showMentions, setShowMentions] = useState(false)

  // 字体大小调节（持久化到 localStorage）
  const [fontScale, setFontScale] = useState<number>(() => {
    const saved = Number(localStorage.getItem('postFontScale'))
    return saved >= 80 && saved <= 160 ? saved : 100
  })
  useEffect(() => {
    localStorage.setItem('postFontScale', String(fontScale))
  }, [fontScale])

  // 上一篇/下一篇导航
  const [neighbors, setNeighbors] = useState<{ previous: PostNeighbor | null; next: PostNeighbor | null }>({ previous: null, next: null })

  const loadPost = useCallback(() => {
    if (!slug) return
    setLoading(true)
    getPost(slug)
      .then((data) => {
        setPost(data)
        setToc(extractToc(data.content))
        setLoading(false)
        recordVisit({
          slug: data.slug,
          title: data.title,
          excerpt: data.excerpt,
          cover_image: data.cover_image,
          author_username: data.author_username ?? undefined,
        })
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
    function handleScroll() {
      const el = document.querySelector('.article')
      if (!el) return
      const rect = el.getBoundingClientRect()
      const total = el.scrollHeight - window.innerHeight
      // 文章短于视口时 total <= 0，直接置 0 避免 NaN%
      if (total <= 0) {
        setReadProgress(0)
        return
      }
      const scrolled = -rect.top
      const pct = Math.min(Math.max(scrolled / total * 100, 0), 100)
      setReadProgress(pct)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // 防抖地把阅读进度同步到本地历史，便于"继续阅读"
  useEffect(() => {
    if (!slug || readProgress === 0) return
    const t = setTimeout(() => updateProgress(slug, Math.round(readProgress)), 800)
    return () => clearTimeout(t)
  }, [slug, readProgress, updateProgress])

  useEffect(() => {
    loadPost()
  }, [loadPost])

  // 加载上下篇导航
  useEffect(() => {
    if (!slug) return
    getPostNeighbors(slug).then(setNeighbors).catch(() => {})
  }, [slug])

  // 加载作者社交资料
  useEffect(() => {
    if (!post?.author_username) {
      setAuthorProfile(null)
      return
    }
    let active = true
    getUserProfile(post.author_username)
      .then((p) => {
        if (!active) return
        setAuthorProfile(p.user)
      })
      .catch(() => {
        if (!active) return
        setAuthorProfile(null)
      })
    return () => {
      active = false
    }
  }, [post?.author_username])

  useEffect(() => {
    loadComments()
    loadLikeStatus()
  }, [loadComments, loadLikeStatus])

  useEffect(() => {
    if (!mentionQuery) {
      setMentionResults([])
      setShowMentions(false)
      return
    }
    const timer = setTimeout(() => {
      searchUsers(mentionQuery).then(results => {
        setMentionResults(results)
        setShowMentions(results.length > 0)
        setMentionIndex(0)
      })
    }, 200)
    return () => clearTimeout(timer)
  }, [mentionQuery])

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

  // Prism 语法高亮 + 复制按钮
  useEffect(() => {
    if (!post) return
    Prism.highlightAll()
    document.querySelectorAll('.article__body pre.code-block').forEach(pre => {
      if (pre.querySelector('.code-copy-btn')) return
      const btn = document.createElement('button')
      btn.className = 'code-copy-btn'
      btn.textContent = '复制'
      btn.onclick = async () => {
        const code = pre.querySelector('code')
        if (!code) return
        await navigator.clipboard.writeText(code.textContent || '')
        btn.textContent = '已复制'
        setTimeout(() => { btn.textContent = '复制' }, 2000)
      }
      ;(pre as HTMLElement).style.position = 'relative'
      pre.appendChild(btn)
    })
  }, [post])

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

  function handleCommentInput(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const value = e.target.value
    setCommentText(value)

    // 检测 @ 输入
    const cursorPos = e.target.selectionStart
    const textBeforeCursor = value.slice(0, cursorPos)
    const atMatch = textBeforeCursor.match(/@([a-zA-Z0-9_]*)$/)
    if (atMatch) {
      setMentionQuery(atMatch[1])
    } else {
      setMentionQuery('')
      setShowMentions(false)
    }
  }

  function insertMention(username: string) {
    const textarea = document.querySelector('.comment-form__textarea') as HTMLTextAreaElement
    if (!textarea) return
    const cursorPos = textarea.selectionStart
    const textBefore = commentText.slice(0, cursorPos)
    const textAfter = commentText.slice(cursorPos)
    const atMatch = textBefore.match(/@[a-zA-Z0-9_]*$/)
    if (atMatch) {
      const before = textBefore.slice(0, -atMatch[0].length)
      setCommentText(before + '@' + username + ' ' + textAfter)
    } else {
      setCommentText(commentText + '@' + username + ' ')
    }
    setShowMentions(false)
    setMentionQuery('')
    textarea.focus()
  }

  function handleCommentKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (!showMentions || mentionResults.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setMentionIndex(prev => Math.min(prev + 1, mentionResults.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setMentionIndex(prev => Math.max(prev - 1, 0))
    } else if (e.key === 'Enter' && mentionIndex >= 0) {
      e.preventDefault()
      insertMention(mentionResults[mentionIndex].username)
    } else if (e.key === 'Escape') {
      setShowMentions(false)
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

  async function handleSaveEdit(id: number) {
    const text = editText.trim()
    if (!text) return
    setEditBusy(true)
    try {
      const updated = await editComment(id, text)
      setComments((prev) => prev.map((c) => (c.id === id ? { ...c, ...updated } : c)))
      setEditingCommentId(null)
      setEditText('')
    } catch (err) {
      alert(err instanceof Error ? err.message : '编辑失败')
    } finally {
      setEditBusy(false)
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

  // 统计某条评论下所有子孙回复总数（递归）
  function countAllReplies(id: number): number {
    const kids = repliesOf(id)
    let n = kids.length
    for (const k of kids) n += countAllReplies(k.id)
    return n
  }

  function toggleCollapse(id: number) {
    setCollapsedComments((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function renderComment(c: Comment) {
    const isMine = user && c.user_id === user.id
    const canDel = isMine || user?.role === 'admin'
    const canEdit = isMine || user?.role === 'admin'
    const isEditing = editingCommentId === c.id
    const kids = repliesOf(c.id)
    const cLiked = !!c.liked
    const cLikesCount = c.likes_count ?? 0
    const cBusy = !!commentLikeBusy[c.id]
    const isCollapsed = collapsedComments.has(c.id)
    const totalReplies = kids.length > 0 ? countAllReplies(c.id) : 0
    return (
      <li key={c.id} className={`comment${isCollapsed ? ' comment--collapsed' : ''}`}>
        <Link to={`/${c.author_username}`} className="comment__avatar">
          {c.author_avatar ? (
            <img src={c.author_avatar} alt={c.author_username} loading="lazy" />
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
              <span className="comment__time">
                {formatRelative(c.created_at)}
                {c.updated_at && <span className="comment__edited">（已编辑）</span>}
              </span>
              {/* 折叠/展开按钮：始终可点击 */}
              <button
                type="button"
                className="comment__collapse-btn"
                onClick={() => toggleCollapse(c.id)}
                title={isCollapsed ? '展开评论' : '折叠评论'}
                aria-expanded={!isCollapsed}
              >
                {isCollapsed ? '▸' : '▾'}
              </button>
            </div>
            {isCollapsed ? (
              <div className="comment__collapsed-summary">
                <span className="comment__collapsed-text">已折叠</span>
                {totalReplies > 0 && (
                  <button
                    type="button"
                    className="comment__collapsed-replies"
                    onClick={() => toggleCollapse(c.id)}
                  >
                    {totalReplies} 条回复
                  </button>
                )}
              </div>
            ) : isEditing ? (
              <div className="comment__edit">
                <textarea
                  rows={3}
                  className="comment__edit-textarea"
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  disabled={editBusy}
                />
                <div className="reply-box__actions">
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => { setEditingCommentId(null); setEditText('') }}
                    disabled={editBusy}
                  >
                    取消
                  </button>
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={() => handleSaveEdit(c.id)}
                    disabled={!editText.trim() || editBusy}
                  >
                    保存
                  </button>
                </div>
              </div>
            ) : (
              <p className="comment__content">{renderCommentContent(c.content)}</p>
            )}
          </div>
          {!isCollapsed && (
            <>
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
                {canEdit && !isEditing && (
                  <button
                    type="button"
                    className="comment__action"
                    onClick={() => {
                      setEditingCommentId(c.id)
                      setEditText(c.content)
                    }}
                  >
                    编辑
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
                {/* 折叠整条评论树（含回复）按钮 */}
                {kids.length > 0 && (
                  <button
                    type="button"
                    className="comment__action comment__action--collapse"
                    onClick={() => toggleCollapse(c.id)}
                  >
                    折叠{totalReplies > 0 ? ` (${totalReplies})` : ''}
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
            </>
          )}
        </div>
      </li>
    )
  }

  const authorAvatar = post.author_avatar || ''

  return (
    <>
    {post && (
      <div className="reading-progress" style={{ width: `${readProgress}%` }} />
    )}
    <div className="post-layout">
      <PostSidebar post={post} />
      <div className="post-main">
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
          <div className="article__font-controls" role="group" aria-label="字体大小">
            <button
              type="button"
              className="article__font-btn"
              title="缩小字体"
              onClick={() => setFontScale((s) => Math.max(80, s - 10))}
              disabled={fontScale <= 80}
            >A−</button>
            <span className="article__font-scale">{fontScale}%</span>
            <button
              type="button"
              className="article__font-btn"
              title="放大字体"
              onClick={() => setFontScale((s) => Math.min(160, s + 10))}
              disabled={fontScale >= 160}
            >A+</button>
          </div>
        </div>

        <header className="article__header">
          <span className="article__category">{post.category}</span>
          <h1 className="article__title">{post.title}</h1>
          {post.excerpt && <p className="article__excerpt">{post.excerpt}</p>}
          <div className="article__meta">
            <span className="article__author">
              {authorAvatar && (
                <span className="article__author-avatar">
                  <img src={authorAvatar} alt={author} loading="lazy" />
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
          {authorProfile && <SocialLinks user={authorProfile} size="sm" />}
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
          style={{ fontSize: `${fontScale}%` }}
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

        {/* 上一篇 / 下一篇导航 */}
        {(neighbors.previous || neighbors.next) && (
          <nav className="post-nav" aria-label="文章导航">
            {neighbors.previous ? (
              <Link to={`/post/${neighbors.previous.slug}`} className="post-nav__item post-nav__item--prev">
                <span className="post-nav__label">← 上一篇</span>
                <span className="post-nav__title">{neighbors.previous.title}</span>
              </Link>
            ) : (
              <span className="post-nav__item post-nav__item--prev post-nav__item--empty" />
            )}
            {neighbors.next ? (
              <Link to={`/post/${neighbors.next.slug}`} className="post-nav__item post-nav__item--next">
                <span className="post-nav__label">下一篇 →</span>
                <span className="post-nav__title">{neighbors.next.title}</span>
              </Link>
            ) : (
              <span className="post-nav__item post-nav__item--next post-nav__item--empty" />
            )}
          </nav>
        )}

        {/* Comments section */}
        <section className="comments" id="comments">
          <div className="comments__header">
            <h2 className="comments__title">
              对话
            </h2>
            <span className="comments__count">{comments.length} 条评论</span>
            {topLevel.length > 0 && (
              <button
                type="button"
                className="comments__toggle-all"
                onClick={() => {
                  // 若当前有任意顶层评论被折叠，则全部展开；否则全部折叠
                  const anyCollapsed = topLevel.some((c) => collapsedComments.has(c.id))
                  if (anyCollapsed) {
                    setCollapsedComments(new Set())
                  } else {
                    setCollapsedComments(new Set(topLevel.map((c) => c.id)))
                  }
                }}
              >
                {topLevel.some((c) => collapsedComments.has(c.id)) ? '展开全部' : '折叠全部'}
              </button>
            )}
          </div>

          {user ? (
            <form className="comment-form" onSubmit={handleSubmitComment}>
              {commentError && <div className="form__error">{commentError}</div>}
              <div className="comment-form__input-wrap">
              <textarea
                className="comment-form__textarea"
                rows={3}
                placeholder="分享你的想法… 输入 @ 提及用户"
                value={commentText}
                onChange={handleCommentInput}
                onKeyDown={handleCommentKeyDown}
                required
              />
              {showMentions && mentionResults.length > 0 && (
                <div className="mention-dropdown">
                  {mentionResults.map((u, i) => (
                    <button
                      key={u.id}
                      type="button"
                      className={`mention-dropdown__item ${i === mentionIndex ? 'mention-dropdown__item--active' : ''}`}
                      onMouseDown={(e) => {
                        e.preventDefault()
                        insertMention(u.username)
                      }}
                    >
                      {u.avatar ? (
                        <img src={u.avatar} alt="" className="mention-dropdown__avatar" loading="lazy" width={32} height={32} />
                      ) : (
                        <span className="mention-dropdown__avatar-fallback">{u.username.charAt(0).toUpperCase()}</span>
                      )}
                      <span className="mention-dropdown__name">
                        <strong>@{u.username}</strong>
                        {u.display_name && <span className="mention-dropdown__display">{u.display_name}</span>}
                      </span>
                    </button>
                  ))}
                </div>
              )}
              </div>
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
            <>
              <ul className="comment-list">{topLevel.slice(0, visibleComments).map(renderComment)}</ul>
              {topLevel.length > visibleComments && (
                <div className="comments__load-more">
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setVisibleComments((v) => v + 10)}
                  >
                    加载更多评论（剩余 {topLevel.length - visibleComments} 条）
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      </article>
      </div>
      {toc.length >= 2 && (
        <aside className="post-toc" aria-label="文章目录">
          <TableOfContents items={toc} />
        </aside>
      )}
    </div>
    </>
  )
}
