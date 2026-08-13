import { useEffect, useState, useCallback, FormEvent, useRef } from 'react'
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
  getRelatedPosts,
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
  estimateReadingTime,
  recordPostView,
  getPostStats,
  createShareLink,
  getPostOnlineCount,
  postHeartbeat,
} from '../api'
import type { PostNeighbor, RelatedPost, PostStats } from '../api'
import { useAuth } from '../auth/AuthContext'
import { useReadingHistory, load as loadHistory } from '../hooks/useReadingHistory'
import SEO, { setMetaTag, setJsonLd, cleanupDynamicMeta } from '../components/SEO'
import PostSidebar from '../components/PostSidebar'
import TableOfContents from '../components/TableOfContents'
import SocialLinks from '../components/SocialLinks'
import RevisionHistory from '../components/RevisionHistory'
import ImageLightbox from '../components/ImageLightbox'
import type { LightboxImage } from '../components/ImageLightbox'
import DOMPurify from 'dompurify'

/** Minimal markdown → HTML renderer (headings, lists, code, blockquote, bold, italic) */
export function renderMarkdown(
  md: string,
  options: { images?: boolean; mentions?: boolean } = {},
): string {
  const { images = true, mentions = false } = options
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
    // ![alt](url) — 仅文章正文允许图片，评论中禁用
    if (images) {
      processed = processed
        .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_, alt, url) =>
          stash(`<img src="${url}" alt="${alt}" loading="lazy" class="lazy-load" onerror="this.classList.add('loaded')" onload="this.classList.add('loaded')" style="max-width:100%;border-radius:8px;margin:0.5rem 0;" />`),
        )
    }
    processed = processed
      // [text](url)
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, url) =>
        stash(`<a href="${url}" target="_blank" rel="noreferrer noopener">${label}</a>`),
      )
    // 评论 @username 提及 → 可点击链接（在转义之前 stash，避免被破坏；代码块不走 inline，故不受影响）
    if (mentions) {
      processed = processed.replace(
        /(?<![a-zA-Z0-9_])@([a-zA-Z0-9_]{3,20})/g,
        (_, username) => stash(`<a href="/${username}" class="mention">@${username}</a>`),
      )
    }
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
        html += `<pre class="code-block" data-lang="${codeLang || 'text'}"><code class="language-${codeLang || 'text'}">${codeBuffer.join('\n').replace(/</g, '&lt;')}</code></pre>\n`
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
  if (inCode) html += `<pre class="code-block" data-lang="${codeLang || 'text'}"><code class="language-${codeLang || 'text'}">${codeBuffer.join('\n').replace(/</g, '&lt;')}</code></pre>\n`
  // 用 DOMPurify 过滤 XSS：移除 javascript: 协议链接、事件处理器等危险内容
  return DOMPurify.sanitize(html, {
    ADD_ATTR: ['target', 'rel', 'class', 'data-lang'],
    FORBID_TAGS: images ? [] : ['img'],
  })
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

/** 代码块语言标识 → 中文展示名 */
const LANG_LABELS: Record<string, string> = {
  javascript: 'JavaScript',
  js: 'JavaScript',
  typescript: 'TypeScript',
  ts: 'TypeScript',
  python: 'Python',
  py: 'Python',
  bash: 'Bash',
  sh: 'Shell',
  shell: 'Shell',
  css: 'CSS',
  json: 'JSON',
  sql: 'SQL',
  html: 'HTML',
  markup: 'HTML',
  java: 'Java',
  c: 'C',
  cpp: 'C++',
  'c++': 'C++',
  go: 'Go',
  rust: 'Rust',
  rs: 'Rust',
  yaml: 'YAML',
  yml: 'YAML',
  markdown: 'Markdown',
  md: 'Markdown',
  text: '纯文本',
  '': '代码',
}

function langLabel(lang: string): string {
  const key = (lang || '').toLowerCase().trim()
  return LANG_LABELS[key] || (key ? key.toUpperCase().slice(0, 1) + key.slice(1) : '代码')
}

/** Render comment content as sanitized Markdown HTML.
 *  Supports bold/italic/inline code/code blocks/links/lists/blockquotes (no images),
 *  and converts @username mentions into clickable internal links. */
function renderCommentContent(content: string): string {
  return renderMarkdown(content, { images: false, mentions: true })
}

export default function PostDetail() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [post, setPost] = useState<Post | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [toc, setToc] = useState<Array<{ level: number; text: string; id: string }>>([])
  // 移动端目录抽屉开关
  const [mobileTocOpen, setMobileTocOpen] = useState(false)

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

  // PV/UV 统计：仅作者或管理员可见
  const [postStats, setPostStats] = useState<PostStats | null>(null)

  const [readProgress, setReadProgress] = useState(0)
  // 继续阅读：上次阅读位置恢复
  const [resumeProgress, setResumeProgress] = useState<number | null>(null)
  const [showResumeTip, setShowResumeTip] = useState(false)

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

  // 字体族调节（衬线/无衬线/等宽/系统默认）
  type FontFamily = 'system' | 'serif' | 'sans' | 'mono'
  const [fontFamily, setFontFamily] = useState<FontFamily>(() => {
    const saved = localStorage.getItem('postFontFamily') as FontFamily
    return (saved === 'system' || saved === 'serif' || saved === 'sans' || saved === 'mono') ? saved : 'system'
  })
  useEffect(() => {
    localStorage.setItem('postFontFamily', fontFamily)
  }, [fontFamily])
  const fontFamilyCSS: Record<FontFamily, string> = {
    system: 'var(--font-system, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif)',
    sans: '"PingFang SC", "Microsoft YaHei", Roboto, "Helvetica Neue", Arial, sans-serif',
    serif: '"Songti SC", "SimSun", Georgia, "Times New Roman", serif',
    mono: '"JetBrains Mono", "Fira Code", Consolas, "Courier New", monospace',
  }
  const fontFamilyLabels: Record<FontFamily, string> = {
    system: '默认',
    sans: '无衬线',
    serif: '衬线',
    mono: '等宽',
  }

  // 上一篇/下一篇导航
  const [neighbors, setNeighbors] = useState<{ previous: PostNeighbor | null; next: PostNeighbor | null }>({ previous: null, next: null })

  // 相关文章推荐
  const [relatedPosts, setRelatedPosts] = useState<RelatedPost[]>([])

  // 历史版本弹窗
  const [showRevisions, setShowRevisions] = useState(false)

  // 图片灯箱
  const [lightboxImages, setLightboxImages] = useState<LightboxImage[]>([])
  const [lightboxIndex, setLightboxIndex] = useState(0)
  const [lightboxOpen, setLightboxOpen] = useState(false)

  // 草稿分享弹窗
  const [shareDialogOpen, setShareDialogOpen] = useState(false)
  const [shareUrl, setShareUrl] = useState('')
  const [shareBusy, setShareBusy] = useState(false)
  const [shareError, setShareError] = useState('')
  const [shareCopied, setShareCopied] = useState(false)

  // 密码保护
  const [passwordUnlocked, setPasswordUnlocked] = useState(false)
  const [passwordInput, setPasswordInput] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [verifyingPassword, setVerifyingPassword] = useState(false)

  // 在线人数
  const [onlineCount, setOnlineCount] = useState(0)
  const sessionIdRef = useRef<string>('')

  const loadPost = useCallback(() => {
    if (!slug) return
    setLoading(true)
    getPost(slug)
      .then((data) => {
        // 检查是否已通过会话解锁
        const unlocked = !!data.has_password && document.cookie.includes(`post_unlock_${data.id}=1`)
        setPasswordUnlocked(!data.has_password || unlocked)
        setPost(data)
        if (data.has_password && !unlocked) {
          setToc([])
        } else {
          setToc(extractToc(data.content))
        }
        setLoading(false)

        // 检查本地历史中是否有未完成的阅读进度
        const history = loadHistory()
        const prev = history.find((h) => h.slug === data.slug)
        if (prev && prev.read_progress != null && prev.read_progress >= 15 && prev.read_progress < 95) {
          setResumeProgress(Math.round(prev.read_progress))
          setShowResumeTip(true)
        }

        recordVisit({
          slug: data.slug,
          title: data.title,
          excerpt: data.excerpt,
          cover_image: data.cover_image,
          author_username: data.author_username ?? undefined,
        })

        // 生成本会话 ID 并上报心跳
        if (!sessionIdRef.current) {
          sessionIdRef.current = `s_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
        }
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

  // 点击进度条跳转到对应位置
  function handleProgressClick(e: React.MouseEvent<HTMLDivElement>) {
    const el = document.querySelector('.article')
    if (!el) return
    const total = el.scrollHeight - window.innerHeight
    if (total <= 0) return
    const rect = e.currentTarget.getBoundingClientRect()
    const ratio = (e.clientX - rect.left) / rect.width
    const targetScroll = ratio * total
    const articleTop = el.getBoundingClientRect().top + window.scrollY
    window.scrollTo({ top: articleTop + targetScroll, behavior: 'smooth' })
  }

  // 恢复到上次阅读位置
  function handleResumeReading() {
    if (resumeProgress == null) return
    const el = document.querySelector('.article')
    if (!el) return
    const total = el.scrollHeight - window.innerHeight
    if (total <= 0) return
    const targetScroll = (resumeProgress / 100) * total
    const articleTop = el.getBoundingClientRect().top + window.scrollY
    window.scrollTo({ top: articleTop + targetScroll, behavior: 'smooth' })
    setShowResumeTip(false)
  }

  // 计算 TOC 各章节在进度条上的百分比位置
  function computeTocMarkers(): Array<{ id: string; text: string; pct: number }> {
    if (!post || toc.length === 0) return []
    const el = document.querySelector('.article')
    if (!el) return []
    const articleTop = el.getBoundingClientRect().top + window.scrollY
    const total = el.scrollHeight - window.innerHeight
    if (total <= 0) return []
    return toc
      .map((item) => {
        const headingEl = document.getElementById(item.id)
        if (!headingEl) return null
        const headingTop = headingEl.getBoundingClientRect().top + window.scrollY
        const offset = headingTop - articleTop
        const pct = Math.min(Math.max((offset / total) * 100, 0), 100)
        return { id: item.id, text: item.text, pct }
      })
      .filter((v): v is { id: string; text: string; pct: number } => v != null)
  }
  const [tocMarkers, setTocMarkers] = useState<Array<{ id: string; text: string; pct: number }>>([])
  // 监听 TOC 和 post 变化，更新章节标记位置
  useEffect(() => {
    if (!post || toc.length === 0) { setTocMarkers([]); return }
    // 等待 DOM 渲染完毕
    const t = setTimeout(() => setTocMarkers(computeTocMarkers()), 100)
    const onResize = () => setTocMarkers(computeTocMarkers())
    window.addEventListener('resize', onResize)
    return () => { clearTimeout(t); window.removeEventListener('resize', onResize) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [post, toc])

  useEffect(() => {
    loadPost()
  }, [loadPost])

  // 上报访问（PV/UV）：每篇文章每次加载仅记录一次
  useEffect(() => {
    if (!post?.slug) return
    // 仅对已发布文章上报；草稿预览不计入统计
    if (!post.published) return
    recordPostView(post.slug)
  }, [post?.slug, post?.published])

  // 作者或管理员可查看该文章的 PV/UV
  useEffect(() => {
    if (!post?.slug || !user) {
      setPostStats(null)
      return
    }
    const isAuthor = post.author_id != null && post.author_id === user.id
    const isAdmin = user.role === 'admin'
    if (!isAuthor && !isAdmin) {
      setPostStats(null)
      return
    }
    let active = true
    getPostStats(post.slug)
      .then((s) => {
        if (active) setPostStats(s)
      })
      .catch(() => {
        if (active) setPostStats(null)
      })
    return () => {
      active = false
    }
  }, [post?.slug, post?.author_id, user])

  // 动态注入 Open Graph / Twitter Card / JSON-LD 结构化数据，
  // 组件卸载或切换文章时清理，避免污染其他页面。
  useEffect(() => {
    if (!post) return
    const postUrl = `${window.location.origin}/post/${post.slug}`
    const description = post.excerpt || post.content.slice(0, 150)
    const image = post.cover_image || ''

    // Open Graph
    setMetaTag('og:title', post.title, true)
    setMetaTag('og:description', description, true)
    setMetaTag('og:type', 'article', true)
    setMetaTag('og:site_name', 'Marginalia', true)
    setMetaTag('og:url', postUrl, true)
    if (image) setMetaTag('og:image', image, true)

    // Twitter Card
    setMetaTag('twitter:card', image ? 'summary_large_image' : 'summary')
    setMetaTag('twitter:title', post.title)
    setMetaTag('twitter:description', description)
    if (image) setMetaTag('twitter:image', image)

    // JSON-LD Article 结构化数据
    setJsonLd({
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: post.title,
      description,
      image: image || undefined,
      author: {
        '@type': 'Person',
        name: post.author_username || post.author || '匿名',
      },
      publisher: {
        '@type': 'Organization',
        name: 'Marginalia',
      },
      datePublished: new Date(post.created_at + 'Z').toISOString(),
      dateModified: new Date((post.updated_at || post.created_at) + 'Z').toISOString(),
      mainEntityOfPage: {
        '@type': 'WebPage',
        '@id': postUrl,
      },
    })

    return () => {
      cleanupDynamicMeta()
    }
  }, [post])

  // 加载上下篇导航
  useEffect(() => {
    if (!slug) return
    getPostNeighbors(slug).then(setNeighbors).catch(() => {})
  }, [slug])

  // 加载相关文章推荐
  useEffect(() => {
    if (!slug) return
    getRelatedPosts(slug).then(setRelatedPosts).catch(() => setRelatedPosts([]))
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

  // Prism 语法高亮 + 代码块头部（语言标签 + 复制按钮）
  useEffect(() => {
    if (!post) return
    Prism.highlightAll()
    document.querySelectorAll('.article__body pre.code-block').forEach(pre => {
      // 已处理过则跳过
      if (pre.parentElement?.classList.contains('code-block-wrap')) return
      const langAttr = pre.getAttribute('data-lang') || ''
      const codeEl = pre.querySelector('code')
      const langClass = codeEl?.className.match(/language-([\w-]+)/)
      const lang = langAttr || (langClass ? langClass[1] : '') || 'text'

      // 包裹容器
      const wrap = document.createElement('div')
      wrap.className = 'code-block-wrap'
      // 头部栏：语言标签 + 复制按钮
      const header = document.createElement('div')
      header.className = 'code-block-header'
      const langSpan = document.createElement('span')
      langSpan.className = 'code-block-lang'
      langSpan.textContent = langLabel(lang)
      const copyBtn = document.createElement('button')
      copyBtn.type = 'button'
      copyBtn.className = 'code-block-copy'
      copyBtn.textContent = '复制'
      copyBtn.setAttribute('aria-label', '复制代码')
      copyBtn.onclick = async () => {
        const code = pre.querySelector('code')
        if (!code) return
        try {
          await navigator.clipboard.writeText(code.textContent || '')
          copyBtn.textContent = '已复制'
        } catch {
          copyBtn.textContent = '复制失败'
        }
        setTimeout(() => { copyBtn.textContent = '复制' }, 2000)
      }
      header.appendChild(langSpan)
      header.appendChild(copyBtn)
      wrap.appendChild(header)
      // 把 pre 移入容器
      pre.parentNode?.insertBefore(wrap, pre)
      wrap.appendChild(pre)
    })
  }, [post])

  // 图片懒加载 + 模糊占位
  useEffect(() => {
    if (!post) return
    const lazyImages = Array.from(document.querySelectorAll<HTMLImageElement>('.article__body img.lazy-load'))
    if (lazyImages.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const img = entry.target as HTMLImageElement
            if (!img.dataset.loaded) {
              img.dataset.loaded = 'true'
              img.style.opacity = '1'
              observer.unobserve(img)
            }
          }
        })
      },
      { rootMargin: '50px 0px', threshold: 0.01 }
    )

    lazyImages.forEach((img) => {
      observer.observe(img)
    })

    return () => {
      observer.disconnect()
    }
  }, [post])

  // 图片灯箱：为文章正文内所有图片绑定点击事件
  useEffect(() => {
    if (!post) return
    const imgs = Array.from(document.querySelectorAll<HTMLImageElement>('.article__body img'))
    if (imgs.length === 0) return
    const handlers: Array<() => void> = []
    imgs.forEach((img, idx) => {
      img.style.cursor = 'zoom-in'
      const handler = () => {
        const sources: LightboxImage[] = imgs.map((i) => ({
          src: i.src,
          alt: i.alt || '',
        }))
        setLightboxImages(sources)
        setLightboxIndex(idx)
        setLightboxOpen(true)
      }
      img.addEventListener('click', handler)
      handlers.push(() => img.removeEventListener('click', handler))
    })
    return () => {
      handlers.forEach((off) => off())
    }
  }, [post])

  async function handlePasswordUnlock() {
    if (!post || !passwordInput.trim()) return
    setVerifyingPassword(true)
    setPasswordError('')
    try {
      // 通过带密码参数重新加载文章
      const data = await getPost(`${slug}?password=${encodeURIComponent(passwordInput)}`)
      if (data.content) {
        // 设置 cookie 以便会话内免再次输入
        document.cookie = `post_unlock_${post.id}=1; path=/; max-age=1800`
        setPasswordUnlocked(true)
        setPost(data)
        setToc(extractToc(data.content))
        setPasswordInput('')
      } else {
        setPasswordError('密码错误，请重试')
      }
    } catch {
      setPasswordError('密码错误，请重试')
    } finally {
      setVerifyingPassword(false)
    }
  }

  // 在线人数：加载后开始心跳和轮询
  useEffect(() => {
    if (!post?.id) return
    const sessionId = sessionIdRef.current
    if (!sessionId) return

    // 立即上报一次
    postHeartbeat(post.id, sessionId)
    getPostOnlineCount(post.id).then(setOnlineCount)

    // 心跳：每 30 秒
    const heartbeatTimer = setInterval(() => {
      postHeartbeat(post.id, sessionId)
    }, 30000)

    // 轮询在线人数：每 15 秒
    const countTimer = setInterval(() => {
      getPostOnlineCount(post.id).then(setOnlineCount)
    }, 15000)

    // 页面可见性变化时更新
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        postHeartbeat(post.id, sessionId)
        getPostOnlineCount(post.id).then(setOnlineCount)
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)

    // 页面卸载时清理
    const handleBeforeUnload = () => {
      // 简单方式：通过发送一个不带 session 的请求来减少计数
      // 实际上依赖后端超时机制（60秒）自动清理
    }
    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      clearInterval(heartbeatTimer)
      clearInterval(countTimer)
      document.removeEventListener('visibilitychange', handleVisibility)
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [post?.id])

  // 文章页快捷键
  useEffect(() => {
    if (!post) return
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable
      if (isInput) return

      // 仅在文章页生效
      if (!post.has_password || passwordUnlocked) {
        if (e.key === 'ArrowLeft' && neighbors.previous) {
          e.preventDefault()
          navigate(`/post/${neighbors.previous.slug}`)
        } else if (e.key === 'ArrowRight' && neighbors.next) {
          e.preventDefault()
          navigate(`/post/${neighbors.next.slug}`)
        } else if (e.key.toLowerCase() === 'f') {
          handleToggleFavorite()
        } else if (e.key.toLowerCase() === 'l') {
          handleToggleLike()
        } else if (e.key.toLowerCase() === 'c') {
          const commentsEl = document.getElementById('comments')
          if (commentsEl) commentsEl.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [post, neighbors, passwordUnlocked, navigate])

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

  async function handleShareDraft() {
    if (!post) return
    if (shareBusy) return
    setShareBusy(true)
    setShareError('')
    try {
      const res = await createShareLink(post.id)
      const origin = window.location.origin
      const url = origin + res.share_url
      setShareUrl(url)
      setShareDialogOpen(true)
      setShareCopied(false)
    } catch (err) {
      setShareError(err instanceof Error ? err.message : '生成分享链接失败')
      setShareDialogOpen(true)
    } finally {
      setShareBusy(false)
    }
  }

  async function handleCopyShareLink() {
    if (!shareUrl) return
    try {
      await navigator.clipboard.writeText(shareUrl)
      setShareCopied(true)
      setTimeout(() => setShareCopied(false), 2000)
    } catch {
      // 降级：选中文本
      const input = document.querySelector('.share-link-input') as HTMLInputElement | null
      if (input) {
        input.select()
        try { document.execCommand('copy'); setShareCopied(true); setTimeout(() => setShareCopied(false), 2000) } catch {}
      }
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
              <div
                className="comment__content comment__content--md"
                dangerouslySetInnerHTML={{ __html: renderCommentContent(c.content) }}
                onClick={(e) => {
                  const anchor = (e.target as HTMLElement).closest('a')
                  if (!anchor) return
                  const href = anchor.getAttribute('href')
                  if (href && href.startsWith('/') && !href.startsWith('//')) {
                    e.preventDefault()
                    navigate(href)
                  }
                }}
              />
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
                {user && (
                  <button
                    type="button"
                    className="comment__action"
                    onClick={() => {
                      // 引用：把评论内容以 Markdown > 格式插入主评论框
                      const quoted = c.content
                        .split('\n')
                        .map(line => `> ${line}`)
                        .join('\n')
                      const header = `> @${c.author_username} 说道：\n${quoted}`
                      const current = commentText.trim()
                        ? commentText + (commentText.endsWith('\n') ? '' : '\n\n')
                        : ''
                      setCommentText(current + header + '\n\n')
                      setReplyTo(null)
                      // 滚动到评论区并聚焦
                      const commentsSection = document.getElementById('comments')
                      if (commentsSection) {
                        commentsSection.scrollIntoView({ behavior: 'smooth', block: 'start' })
                      }
                      setTimeout(() => {
                        const textarea = document.querySelector('.comment-form__textarea') as HTMLTextAreaElement
                        if (textarea) {
                          textarea.focus()
                          textarea.setSelectionRange(textarea.value.length, textarea.value.length)
                        }
                      }, 400)
                    }}
                    title="引用这条评论"
                  >
                    引用
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
      <>
        <div className="reading-progress-wrap" onClick={handleProgressClick} title="点击跳转到对应位置">
          {/* 章节标记 */}
          {tocMarkers.map((m) => (
            <span
              key={m.id}
              className="reading-progress__marker"
              style={{ left: `${m.pct}%` }}
              title={m.text}
            />
          ))}
          {/* 进度条前景 */}
          <div className="reading-progress" style={{ width: `${readProgress}%` }} />
        </div>
        {/* 继续阅读提示 */}
        {showResumeTip && resumeProgress != null && (
          <div className="resume-tip" role="alert">
            <span className="resume-tip__text">上次读到 {resumeProgress}%，是否继续阅读？</span>
            <div className="resume-tip__actions">
              <button
                type="button"
                className="btn-primary btn-sm"
                onClick={handleResumeReading}
              >
                继续阅读
              </button>
              <button
                type="button"
                className="btn-secondary btn-sm"
                onClick={() => setShowResumeTip(false)}
              >
                忽略
              </button>
            </div>
          </div>
        )}
      </>
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
          <div className="article__font-controls" role="group" aria-label="字体设置">
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
            <span className="article__font-divider" />
            <button
              type="button"
              className="article__font-btn article__font-btn--cycle"
              title={`切换字体族：${fontFamilyLabels[fontFamily]}`}
              onClick={() => {
                const order: FontFamily[] = ['system', 'sans', 'serif', 'mono']
                const next = order[(order.indexOf(fontFamily) + 1) % order.length]
                setFontFamily(next)
              }}
            >
              {fontFamilyLabels[fontFamily]}
            </button>
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
            <span title={canEdit && postStats ? `PV ${postStats.pv} · UV ${postStats.uv}` : ''}>
              {post.views} 次浏览
            </span>
            {passwordUnlocked && (
              <>
                <span className="article__meta-divider">·</span>
                <span className="article__online" title="实时在线人数">
                  <span className="article__online-dot" />
                  {onlineCount} 人在线
                </span>
              </>
            )}
            {canEdit && postStats && (
              <>
                <span className="article__meta-divider">·</span>
                <span className="article__pvuv" title="浏览量 / 独立访客">
                  👁 PV {postStats.pv} · UV {postStats.uv}
                </span>
              </>
            )}
            <span className="article__meta-divider">·</span>
            <span>约 {estimateReadingTime(post.content)} 分钟</span>
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

        {(post.has_password && !passwordUnlocked) ? (
          <div className="article__password-lock">
            <div className="article__password-icon">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
              </svg>
            </div>
            <h3 className="article__password-title">此文已加密</h3>
            <p className="article__password-desc">作者为这篇文章设置了访问密码，请输入密码后查看。</p>
            <div className="article__password-form">
              <input
                type="password"
                className="article__password-input"
                value={passwordInput}
                onChange={(e) => { setPasswordInput(e.target.value); setPasswordError('') }}
                onKeyDown={(e) => { if (e.key === 'Enter') handlePasswordUnlock() }}
                placeholder="请输入访问密码"
                autoFocus
              />
              {passwordError && <div className="article__password-error">{passwordError}</div>}
              <button
                type="button"
                className="article__password-submit"
                onClick={handlePasswordUnlock}
                disabled={verifyingPassword || !passwordInput.trim()}
              >
                {verifyingPassword ? '验证中…' : '解锁阅读'}
              </button>
            </div>
            {post.excerpt && (
              <div className="article__password-excerpt">
                <p className="article__password-excerpt-label">摘要（预览）</p>
                <p>{post.excerpt}</p>
              </div>
            )}
          </div>
        ) : (
          <div
            className="article__body"
            style={{
              fontSize: `${fontScale}%`,
              fontFamily: fontFamilyCSS[fontFamily],
            }}
            dangerouslySetInnerHTML={{ __html: renderMarkdown(post.content) }}
          />
        )}

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
            <div style={{ display: 'flex', gap: 'var(--space-xs)', alignItems: 'center' }}>
              <button
                type="button"
                className="btn-edit article__print-btn"
                onClick={() => window.print()}
                title="打印文章"
              >
                打印
              </button>
              {canEdit && (
                <>
                  <Link to={`/edit/${post.id}`} className="btn-edit">
                    编辑
                  </Link>
                  {!post.published && (
                    <button
                      type="button"
                      className="btn-edit"
                      onClick={handleShareDraft}
                      disabled={shareBusy}
                      title="生成草稿分享链接"
                    >
                      {shareBusy ? '生成中…' : '分享草稿'}
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn-edit"
                    onClick={() => setShowRevisions(true)}
                    title="查看历史版本"
                  >
                    历史版本
                  </button>
                  <button onClick={handleDelete} className="btn-delete">
                    删除
                  </button>
                </>
              )}
            </div>
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

        {/* 相关文章推荐 */}
        {relatedPosts.length > 0 && (
          <section className="related-posts" aria-label="相关文章">
            <h2 className="related-posts__title">相关文章</h2>
            <ul className="related-posts__list">
              {relatedPosts.slice(0, 4).map((rp) => {
                const readTime = Math.max(1, Math.ceil((rp.excerpt || '').length / 100))
                return (
                  <li key={rp.id} className="related-posts__item">
                    <Link to={`/post/${rp.slug}`} className="related-posts__link">
                      <span className="related-posts__category">{rp.category}</span>
                      <span className="related-posts__name">{rp.title}</span>
                      <span className="related-posts__meta">{readTime} 分钟阅读</span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </section>
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
    {/* 移动端目录浮动按钮 + 左侧抽屉（桌面端隐藏） */}
    {toc.length >= 2 && (
      <>
        <button
          type="button"
          className="mobile-toc-btn"
          onClick={() => setMobileTocOpen(true)}
          aria-label="打开目录"
          title="目录"
        >
          <span className="mobile-toc-btn__icon" aria-hidden="true">☰</span>
        </button>
        {mobileTocOpen && (
          <>
            <div
              className="mobile-toc-overlay"
              onClick={() => setMobileTocOpen(false)}
            />
            <aside
              className="mobile-toc-drawer"
              aria-label="文章目录"
              onClick={(e) => {
                if ((e.target as HTMLElement).closest('a')) setMobileTocOpen(false)
              }}
            >
              <div className="mobile-toc-drawer__header">
                <span className="mobile-toc-drawer__title">目录</span>
                <button
                  type="button"
                  className="mobile-toc-drawer__close"
                  onClick={() => setMobileTocOpen(false)}
                  aria-label="关闭目录"
                >
                  ✕
                </button>
              </div>
              <TableOfContents items={toc} />
            </aside>
          </>
        )}
      </>
    )}
    {canEdit && (
      <RevisionHistory
        postId={post.id}
        open={showRevisions}
        onClose={() => setShowRevisions(false)}
        onRestored={() => loadPost()}
      />
    )}
    {shareDialogOpen && (
      <div
        className="share-dialog-overlay"
        onClick={() => setShareDialogOpen(false)}
        role="dialog"
        aria-modal="true"
        aria-label="草稿分享链接"
      >
        <div className="share-dialog" onClick={(e) => e.stopPropagation()}>
          <div className="share-dialog__header">
            <h3 className="share-dialog__title">草稿分享链接</h3>
            <button
              type="button"
              className="share-dialog__close"
              onClick={() => setShareDialogOpen(false)}
              aria-label="关闭"
            >
              ✕
            </button>
          </div>
          <p className="share-dialog__desc">
            任何持有此链接的人都可以在 7 天内查看这篇草稿，无需登录。链接过期后自动失效。
          </p>
          {shareError ? (
            <div className="form__error">{shareError}</div>
          ) : (
            <>
              <input
                className="form__input share-link-input"
                type="text"
                value={shareUrl}
                readOnly
                onFocus={(e) => e.target.select()}
              />
              <div className="share-dialog__actions">
                <button
                  type="button"
                  className="btn-primary"
                  onClick={handleCopyShareLink}
                >
                  {shareCopied ? '✓ 已复制' : '复制链接'}
                </button>
                <a
                  className="btn-secondary"
                  href={shareUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  打开预览
                </a>
              </div>
            </>
          )}
        </div>
      </div>
    )}
    <ImageLightbox
      images={lightboxImages}
      index={lightboxIndex}
      open={lightboxOpen}
      onClose={() => setLightboxOpen(false)}
      onIndexChange={setLightboxIndex}
    />
    </>
  )
}
