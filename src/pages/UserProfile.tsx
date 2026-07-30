import { useEffect, useState, useMemo, useRef } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { getUserProfile, toggleFollow, type UserProfile } from '../api'
import { useAuth } from '../auth/AuthContext'
import SEO from '../components/SEO'

function formatDate(dateStr: string): string {
  return new Date(dateStr + 'Z').toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

const RESERVED_PATHS = ['post', 'login', 'register', 'search', 'new', 'edit', 'mailbox', 'favorites', 'drafts', 'notifications', 'security', 'promote', 'bug-report', 'github-callback', 'oauth-setup', 'settings', 'customize', 'admin', 'analytics']

export default function UserProfile() {
  const { username } = useParams<{ username: string }>()
  const { user: currentUser } = useAuth()
  const navigate = useNavigate()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [followLoading, setFollowLoading] = useState(false)
  const [isFollowing, setIsFollowing] = useState(false)
  const styleRef = useRef<HTMLStyleElement | null>(null)
  const [activeCategory, setActiveCategory] = useState('全部')
  const [visibleCount, setVisibleCount] = useState(10)

  useEffect(() => {
    if (username && RESERVED_PATHS.includes(username.toLowerCase())) {
      navigate('/')
    }
  }, [username, navigate])

  const displayName = useMemo(() => {
    return profile?.user.display_name || profile?.user.username || ''
  }, [profile])

  const isOwnProfile = currentUser?.username === username

  useEffect(() => {
    if (!username) return
    setLoading(true)
    setError('')
    setActiveCategory('全部')
    setVisibleCount(10)
    getUserProfile(username)
      .then((p) => {
        setProfile(p)
        setIsFollowing(!!p.is_following)
        setLoading(false)
      })
      .catch((err) => {
        setError(err.message || '加载失败')
        setLoading(false)
      })
  }, [username])

  useEffect(() => {
    const css = profile?.user.profile_css
    if (!css || !profile?.user.username) {
      if (styleRef.current) {
        styleRef.current.textContent = ''
      }
      return
    }

    if (!styleRef.current) {
      const style = document.createElement('style')
      style.setAttribute('data-profile-css', profile.user.username)
      document.head.appendChild(style)
      styleRef.current = style
    }

    const scope = `[data-profile="${profile.user.username}"]`
    const scoped = buildScopedCSS(css, scope)
    styleRef.current.textContent = scoped

    return () => {
      if (styleRef.current) {
        styleRef.current.textContent = ''
      }
    }
  }, [profile?.user.profile_css, profile?.user.username])

  async function handleToggleFollow() {
    if (!profile || !currentUser) {
      navigate('/login?redirect=' + encodeURIComponent(`/${username}`))
      return
    }
    if (followLoading) return
    setFollowLoading(true)
    const prev = isFollowing
    setIsFollowing(!prev)
    try {
      const res = await toggleFollow(profile.user.username)
      setIsFollowing(res.following)
      // 重新拉取以更新粉丝数
      const p = await getUserProfile(profile.user.username)
      setProfile(p)
    } catch (err) {
      setIsFollowing(prev)
      alert(err instanceof Error ? err.message : '操作失败')
    } finally {
      setFollowLoading(false)
    }
  }

  if (loading) return <div className="loading">加载中</div>
  if (error) return (
    <div className="error-state">
      <h2 className="error-state__title">加载失败</h2>
      <p className="error-state__msg">{error}</p>
    </div>
  )
  if (!profile) return null

  const { user, posts, stats, categories } = profile

  const profileStyle: React.CSSProperties = {}
  if (user.profile_bg) {
    profileStyle.background = user.profile_bg
  }

  // 解析布局配置
  const layoutRaw = (user as unknown as { profile_layout?: string }).profile_layout || ''
  let sectionOrder: { id: string; visible: boolean }[] = [
    { id: 'banner', visible: true },
    { id: 'stats', visible: true },
    { id: 'achievements', visible: true },
    { id: 'posts', visible: true },
  ]
  if (layoutRaw) {
    try {
      const parsed = JSON.parse(layoutRaw)
      if (parsed.sections && Array.isArray(parsed.sections)) {
        sectionOrder = parsed.sections
      }
    } catch {
      // 使用默认布局
    }
  }

  // 渲染各个 section
  function renderSection(sectionId: string) {
    switch (sectionId) {
      case 'banner':
        return (
          <div className="profile-banner" key="banner">
            <div className="container profile-banner__inner">
              <div className="profile-banner__avatar-wrap">
                <div className="profile-banner__avatar">
                  {user.avatar ? (
                    <img src={user.avatar} alt={displayName} />
                  ) : (
                    <div className="profile-banner__avatar-fallback">
                      {displayName.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="profile-banner__ring" aria-hidden />
              </div>

              <div className="profile-banner__info">
                <div className="profile-banner__name-row">
                  <h1 className="profile-banner__name">{displayName}</h1>
                  {user.role === 'admin' && (
                    <span className="profile-banner__badge" title="管理员">管理员</span>
                  )}
                </div>
                <p className="profile-banner__username">@{user.username}</p>
                {user.bio && <p className="profile-banner__bio">{user.bio}</p>}

                <div className="profile-banner__meta">
                  {user.location && (
                    <span className="profile-banner__meta-item">
                      <span className="profile-banner__meta-icon">📍</span>
                      {user.location}
                    </span>
                  )}
                  {user.website && (
                    <a
                      href={user.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="profile-banner__meta-item"
                    >
                      <span className="profile-banner__meta-icon">🔗</span>
                      {user.website.replace(/^https?:\/\//, '')}
                    </a>
                  )}
                  <span className="profile-banner__meta-item">
                    <span className="profile-banner__meta-icon">📅</span>
                    加入于 {formatDate(user.created_at)}
                  </span>
                </div>

                <SocialLinks user={user} />

                <div className="profile-banner__actions">
                  {isOwnProfile ? (
                    <>
                      <button
                        type="button"
                        className="btn-primary"
                        onClick={() => navigate('/settings')}
                      >
                        编辑资料
                      </button>
                      <Link
                        to="/customize"
                        className="btn-secondary"
                        style={{ textDecoration: 'none' }}
                      >
                        自定义空间
                      </Link>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        className={isFollowing ? 'btn-secondary' : 'btn-primary'}
                        onClick={handleToggleFollow}
                        disabled={followLoading}
                      >
                        {isFollowing ? '已关注' : '+ 关注'}
                      </button>
                      <Link
                        to={`/mailbox/new?to=${encodeURIComponent(user.username)}`}
                        className="btn-secondary"
                        style={{ textDecoration: 'none' }}
                      >
                        发站内信
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )
      case 'stats':
        return (
          <div className="profile-stats-bar" key="stats">
            <div className="container profile-stats-bar__inner profile-stats--extended">
              <Link to={`/${user.username}`} className="profile-stat">
                <strong>{stats.posts_count}</strong>
                <span>帖子</span>
              </Link>
              <div className="profile-stat">
                <strong>{stats.comments_count}</strong>
                <span>评论</span>
              </div>
              <div className="profile-stat">
                <strong>{stats.total_likes_received}</strong>
                <span>获赞</span>
              </div>
              <div className="profile-stat">
                <strong>{stats.total_favorites_received}</strong>
                <span>被收藏</span>
              </div>
              <div className="profile-stat">
                <strong>{stats.total_comments_received ?? 0}</strong>
                <span>被评论</span>
              </div>
              <div className="profile-stat">
                <strong>{stats.following_count ?? 0}</strong>
                <span>关注</span>
              </div>
              <div className="profile-stat">
                <strong>{stats.followers_count ?? 0}</strong>
                <span>粉丝</span>
              </div>
            </div>
          </div>
        )
      case 'achievements':
        return <Achievements key="achievements" stats={stats} />
      case 'posts':
        return (
          <ProfilePosts
            key="posts"
            posts={posts}
            categories={categories || []}
            activeCategory={activeCategory}
            visibleCount={visibleCount}
            onSelectCategory={(cat) => {
              setActiveCategory(cat)
              setVisibleCount(10)
            }}
            onShowMore={() => setVisibleCount((c) => c + 10)}
            isOwnProfile={isOwnProfile}
            displayName={displayName}
          />
        )
      case 'bio':
        return user.bio ? (
          <div className="container profile-bio-section" key="bio">
            <div className="section-header">
              <h2 className="section-header__title">关于我</h2>
            </div>
            <p className="profile-bio-section__text">{user.bio}</p>
          </div>
        ) : null
      case 'social':
        return (user.website || user.location) ? (
          <div className="container profile-social-section" key="social">
            <div className="section-header">
              <h2 className="section-header__title">社交链接</h2>
            </div>
            <div className="profile-social-section__links">
              {user.website && (
                <a href={user.website} target="_blank" rel="noopener noreferrer" className="profile-social-section__link">
                  <span className="profile-social-section__icon">🔗</span>
                  {user.website.replace(/^https?:\/\//, '')}
                </a>
              )}
              {user.location && (
                <span className="profile-social-section__link">
                  <span className="profile-social-section__icon">📍</span>
                  {user.location}
                </span>
              )}
            </div>
          </div>
        ) : null
      default:
        return null
    }
  }

  return (
    <div
      className="user-profile"
      data-profile={user.username}
      style={profileStyle}
    >
      <SEO
        title={displayName || user.username}
        description={user.bio || `@${user.username} 的个人主页 - Marginalia`}
        type="profile"
      />
      {sectionOrder.filter((s) => s.visible).map((s) => renderSection(s.id))}
    </div>
  )
}

// ===== 成就徽章 =====
interface AchievementsProps {
  stats: {
    posts_count: number
    total_likes_received: number
    total_favorites_received: number
    total_comments_received?: number
  }
}

interface Badge {
  icon: string
  label: string
}

function Achievements({ stats }: AchievementsProps) {
  const totalComments = stats.total_comments_received ?? 0
  const badges: Badge[] = []

  if (stats.posts_count >= 1) badges.push({ icon: '🌱', label: '新手作者' })
  if (stats.posts_count >= 10) badges.push({ icon: '📝', label: '勤奋作者' })
  if (stats.posts_count >= 50) badges.push({ icon: '📚', label: '高产作者' })
  if (stats.total_likes_received >= 10) badges.push({ icon: '❤️', label: '人气作者' })
  if (stats.total_likes_received >= 100) badges.push({ icon: '🔥', label: '热门博主' })
  if (totalComments >= 20) badges.push({ icon: '💬', label: '互动达人' })
  if (stats.total_favorites_received >= 10) badges.push({ icon: '⭐', label: '优质内容' })

  if (badges.length === 0) return null

  return (
    <div className="container profile-achievements-wrap" key="achievements">
      <div className="profile-achievements">
        {badges.map((b) => (
          <span key={b.label} className="profile-achievement">
            <span className="profile-achievement__icon">{b.icon}</span>
            {b.label}
          </span>
        ))}
      </div>
    </div>
  )
}

// ===== 作品集文章列表 =====
interface ProfilePostsProps {
  posts: import('../types').Post[]
  categories: Array<{ category: string; count: number }>
  activeCategory: string
  visibleCount: number
  onSelectCategory: (cat: string) => void
  onShowMore: () => void
  isOwnProfile: boolean
  displayName: string
}

function ProfilePosts({
  posts,
  categories,
  activeCategory,
  visibleCount,
  onSelectCategory,
  onShowMore,
  isOwnProfile,
  displayName,
}: ProfilePostsProps) {
  const filtered =
    activeCategory === '全部'
      ? posts
      : posts.filter((p) => p.category === activeCategory)
  const visible = filtered.slice(0, visibleCount)
  const hasMore = visibleCount < filtered.length

  return (
    <div className="profile-posts" key="posts">
      <div className="profile-posts__header">
        <h2 className="profile-posts__title">
          {isOwnProfile ? '我的文章' : `${displayName} 的文章`}
        </h2>
        <span className="section-header__count">{filtered.length} 篇</span>
      </div>

      {posts.length === 0 ? (
        <div className="profile-posts__empty">
          <div className="empty-state__icon">✍️</div>
          <p>
            {isOwnProfile ? '还没有发布过文章，去写第一篇吧' : 'TA还没有发布文章'}
          </p>
          {isOwnProfile && (
            <Link to="/new" className="btn-primary">写一篇</Link>
          )}
        </div>
      ) : (
        <>
          {categories.length > 0 && (
            <div className="profile-posts__categories">
              <button
                type="button"
                className={`profile-posts__category${activeCategory === '全部' ? ' profile-posts__category--active' : ''}`}
                onClick={() => onSelectCategory('全部')}
              >
                全部
              </button>
              {categories.map((c) => (
                <button
                  key={c.category}
                  type="button"
                  className={`profile-posts__category${activeCategory === c.category ? ' profile-posts__category--active' : ''}`}
                  onClick={() => onSelectCategory(c.category)}
                >
                  {c.category} ({c.count})
                </button>
              ))}
            </div>
          )}

          <div className="profile-posts__list">
            {visible.map((post) => (
              <Link
                key={post.id}
                to={`/post/${post.slug}`}
                className="profile-post-card"
              >
                {post.cover_image && (
                  <img
                    src={post.cover_image}
                    alt={post.title}
                    className="profile-post-card__cover"
                    loading="lazy"
                  />
                )}
                <div className="profile-post-card__body">
                  <span className="profile-post-card__category">{post.category}</span>
                  <h3 className="profile-post-card__title">{post.title}</h3>
                  {post.excerpt && (
                    <p className="profile-post-card__excerpt">{post.excerpt}</p>
                  )}
                  <div className="profile-post-card__meta">
                    <span>📅 {formatDate(post.created_at)}</span>
                    <span>👁 {post.views ?? 0}</span>
                    <span>❤️ {post.likes_count ?? 0}</span>
                    <span>💬 {post.comments_count ?? 0}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {visible.length === 0 && (
            <div className="profile-posts__empty">
              该分类下暂无文章
            </div>
          )}

          {hasMore && (
            <button
              type="button"
              className="profile-posts__more"
              onClick={onShowMore}
            >
              加载更多
            </button>
          )}
        </>
      )}
    </div>
  )
}

function buildScopedCSS(css: string, scope: string): string {
  const DANGEROUS = [
    /url\s*\(/gi,
    /expression\s*\(/gi,
    /javascript\s*:/gi,
    /data\s*:/gi,
    /@import/gi,
    /@font-face/gi,
    /@keyframes/gi,
    /behavior\s*:/gi,
    /-moz-binding/gi,
  ]

  let safe = css
  for (const p of DANGEROUS) safe = safe.replace(p, '')

  if (safe.length > 10000) safe = safe.slice(0, 10000)

  const blocks = safe.split('}')
  const result: string[] = []

  for (const block of blocks) {
    const trimmed = block.trim()
    if (!trimmed) continue
    const parts = trimmed.split('{')
    if (parts.length < 2) continue

    let selector = parts[0].trim()
    const body = parts.slice(1).join('{').trim()
    if (!selector || !body) continue

    const selectors = selector.split(',').map((s) => s.trim())
    const scoped = selectors.map((s) => {
      if (s.startsWith('::') || s.startsWith(':')) return `${scope}${s}`
      return `${scope} ${s}`
    })

    result.push(`${scoped.join(', ')} { ${body} }`)
  }

  return result.join('\n')
}

// ===== 社交联系方式图标 =====
interface SocialLinksProps {
  user: {
    social_github?: string
    social_twitter?: string
    social_qq?: string
    social_wechat?: string
    social_telegram?: string
    social_bilibili?: string
    social_email?: string
  }
}

function SocialLinks({ user }: SocialLinksProps) {
  const links: Array<{
    key: string
    cls: string
    href?: string
    title: string
    icon: React.ReactNode
  }> = []

  if (user.social_github?.trim()) {
    links.push({
      key: 'github',
      cls: 'social-link--github',
      href: `https://github.com/${user.social_github.trim()}`,
      title: `GitHub: ${user.social_github.trim()}`,
      icon: <GithubIcon />,
    })
  }
  if (user.social_twitter?.trim()) {
    links.push({
      key: 'twitter',
      cls: 'social-link--twitter',
      href: `https://twitter.com/${user.social_twitter.trim()}`,
      title: `Twitter/X: ${user.social_twitter.trim()}`,
      icon: <TwitterIcon />,
    })
  }
  if (user.social_qq?.trim()) {
    links.push({
      key: 'qq',
      cls: 'social-link--qq',
      href: `tencent://message/?uin=${user.social_qq.trim()}`,
      title: `QQ: ${user.social_qq.trim()}`,
      icon: <QqIcon />,
    })
  }
  if (user.social_wechat?.trim()) {
    links.push({
      key: 'wechat',
      cls: 'social-link--wechat',
      title: `微信号: ${user.social_wechat.trim()}`,
      icon: <WechatIcon />,
    })
  }
  if (user.social_telegram?.trim()) {
    links.push({
      key: 'telegram',
      cls: 'social-link--telegram',
      href: `https://t.me/${user.social_telegram.trim()}`,
      title: `Telegram: ${user.social_telegram.trim()}`,
      icon: <TelegramIcon />,
    })
  }
  if (user.social_bilibili?.trim()) {
    links.push({
      key: 'bilibili',
      cls: 'social-link--bilibili',
      href: `https://space.bilibili.com/${user.social_bilibili.trim()}`,
      title: `B站: ${user.social_bilibili.trim()}`,
      icon: <BilibiliIcon />,
    })
  }
  if (user.social_email?.trim()) {
    links.push({
      key: 'email',
      cls: 'social-link--email',
      href: `mailto:${user.social_email.trim()}`,
      title: `邮箱: ${user.social_email.trim()}`,
      icon: <EmailIcon />,
    })
  }

  if (links.length === 0) return null

  return (
    <div className="social-links">
      {links.map((l) =>
        l.href ? (
          <a
            key={l.key}
            href={l.href}
            target={l.href.startsWith('http') ? '_blank' : undefined}
            rel="noopener noreferrer"
            className={`social-link ${l.cls}`}
            title={l.title}
          >
            {l.icon}
          </a>
        ) : (
          <span key={l.key} className={`social-link ${l.cls}`} title={l.title}>
            {l.icon}
          </span>
        )
      )}
    </div>
  )
}

function GithubIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 .5C5.37.5 0 5.78 0 12.29c0 5.2 3.44 9.61 8.21 11.16.6.11.82-.25.82-.56 0-.28-.01-1.02-.02-2-3.34.71-4.04-1.58-4.04-1.58-.55-1.36-1.34-1.72-1.34-1.72-1.09-.73.08-.72.08-.72 1.21.08 1.85 1.22 1.85 1.22 1.07 1.8 2.81 1.28 3.5.98.11-.76.42-1.28.76-1.57-2.67-.3-5.47-1.31-5.47-5.83 0-1.29.47-2.34 1.24-3.17-.12-.3-.54-1.52.12-3.18 0 0 1.01-.32 3.3 1.21a11.6 11.6 0 0 1 6 0c2.29-1.53 3.3-1.21 3.3-1.21.66 1.66.24 2.88.12 3.18.77.83 1.24 1.88 1.24 3.17 0 4.53-2.81 5.53-5.49 5.82.43.36.81 1.08.81 2.18 0 1.58-.01 2.85-.01 3.24 0 .31.22.68.83.56A12.04 12.04 0 0 0 24 12.29C24 5.78 18.63.5 12 .5z" />
    </svg>
  )
}

function TwitterIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z" />
    </svg>
  )
}

function QqIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12.003 0c-3.314 0-6.003 2.687-6.003 6.003 0 .862.184 1.682.512 2.422-1.047.953-2.219 2.584-2.219 5.057 0 .43.05.836.123 1.219-.708.328-1.416.797-1.416 1.4 0 .9 1.275 1.612 2.146 1.93.184.589.46 1.146.785 1.62-.708.43-1.553 1.107-1.553 1.81 0 1.146 2.05 1.93 4.288 1.93.785 0 1.516-.082 2.155-.232.43.334.953.557 1.516.557s1.087-.223 1.516-.557c.64.15 1.37.232 2.155.232 2.238 0 4.288-.784 4.288-1.93 0-.703-.845-1.38-1.553-1.81.326-.474.601-1.031.785-1.62.871-.318 2.146-1.03 2.146-1.93 0-.603-.708-1.072-1.416-1.4.073-.383.123-.789.123-1.219 0-2.473-1.172-4.104-2.219-5.057.328-.74.512-1.56.512-2.422C18.006 2.687 15.317 0 12.003 0z" />
    </svg>
  )
}

function WechatIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 0 1 .213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 0 0 .167-.054l1.903-1.114a.864.864 0 0 1 .717-.098 10.16 10.16 0 0 0 2.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-.576-3.583-4.196-6.348-8.596-6.348zM5.785 5.991c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178A1.17 1.17 0 0 1 4.623 7.17c0-.651.52-1.18 1.162-1.18zm5.813 0c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178 1.17 1.17 0 0 1-1.162-1.178c0-.651.52-1.18 1.162-1.18zm5.34 2.86c-1.797-.052-3.746.512-5.28 1.786-1.72 1.428-2.687 3.72-1.78 6.22.942 2.453 3.666 4.229 6.884 4.229.826 0 1.622-.12 2.361-.336a.722.722 0 0 1 .598.082l1.584.926a.272.272 0 0 0 .14.047c.134 0 .24-.111.24-.247 0-.06-.023-.12-.038-.177l-.327-1.233a.582.582 0 0 1 .193-.555C23.156 18.437 24 16.743 24 14.886c0-3.302-3.05-5.989-6.84-6.034zm-2.293 3.2c.534 0 .967.44.967.983a.976.976 0 0 1-.967.984.976.976 0 0 1-.967-.984c0-.543.433-.983.967-.983zm4.844 0c.534 0 .967.44.967.983a.976.976 0 0 1-.967.984.976.976 0 0 1-.967-.984c0-.543.433-.983.967-.983z" />
    </svg>
  )
}

function TelegramIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.324-.437.89-.663 3.478-1.474 5.797-2.448 6.956-2.924 3.315-1.386 4.006-1.627 4.456-1.636z" />
    </svg>
  )
}

function BilibiliIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.813 4.653h.854c1.51.054 2.769.578 3.773 1.574 1.004.995 1.524 2.249 1.56 3.76v7.36c-.036 1.51-.556 2.769-1.56 3.773s-2.262 1.524-3.773 1.56H5.333c-1.51-.036-2.769-.556-3.773-1.56S.036 18.858 0 17.347v-7.36c.036-1.511.556-2.765 1.56-3.76 1.004-.996 2.262-1.52 3.773-1.574h.774l-1.174-1.12a1.234 1.234 0 0 1-.373-.906c0-.356.124-.658.373-.907l.027-.027c.267-.249.573-.373.92-.373.347 0 .653.124.92.373L9.653 4.44c.071.071.134.142.187.213h4.267a.836.836 0 0 1 .16-.213l2.853-2.747c.267-.249.573-.373.92-.373.347 0 .662.151.929.4.267.249.391.551.391.907 0 .355-.124.657-.373.906L17.813 4.653zM5.333 7.24c-.746.018-1.373.276-1.88.773-.506.498-.769 1.13-.786 1.894v7.52c.017.764.28 1.395.786 1.893.507.498 1.134.756 1.88.773h13.334c.746-.017 1.373-.275 1.88-.773.506-.498.769-1.129.786-1.893v-7.52c-.017-.764-.28-1.396-.786-1.894-.507-.497-1.134-.755-1.88-.773H5.333zM8 11.107c.373 0 .684.124.933.373.25.249.383.569.4.96v1.173c-.017.391-.15.711-.4.96-.249.249-.56.373-.933.373s-.684-.124-.933-.373c-.25-.249-.383-.569-.4-.96V12.44c0-.373.129-.689.387-.947.258-.257.574-.386.946-.386zm8 0c.373 0 .684.124.933.373.25.249.383.569.4.96v1.173c-.017.391-.15.711-.4.96-.249.249-.56.373-.933.373s-.684-.124-.933-.373c-.25-.249-.383-.569-.4-.96V12.44c0-.373.129-.689.387-.947.258-.257.574-.386.946-.386z" />
    </svg>
  )
}

function EmailIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
    </svg>
  )
}
