import { useEffect, useState, useMemo, useRef } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { getUserProfile, toggleFollow, type UserProfile } from '../api'
import { useAuth } from '../auth/AuthContext'
import PostCard from '../components/PostCard'
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

  const { user, posts, stats } = profile

  const profileStyle: React.CSSProperties = {}
  if (user.profile_bg) {
    profileStyle.background = user.profile_bg
  }

  // 解析布局配置
  const layoutRaw = (user as unknown as { profile_layout?: string }).profile_layout || ''
  let sectionOrder: { id: string; visible: boolean }[] = [
    { id: 'banner', visible: true },
    { id: 'stats', visible: true },
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
            <div className="container profile-stats-bar__inner">
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
      case 'posts':
        return (
          <div className="container profile-posts" key="posts">
            <div className="section-header">
              <h2 className="section-header__title">
                {isOwnProfile ? '我的帖子' : `${displayName} 的帖子`}
              </h2>
              <span className="section-header__count">{posts.length} 篇</span>
            </div>
            {posts.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state__icon">✍️</div>
                <p className="empty-state__msg">
                  {isOwnProfile ? '还没有发布过帖子，去写第一篇吧' : '这个人还没有发帖'}
                </p>
                {isOwnProfile && (
                  <Link to="/new" className="btn-primary">写一篇</Link>
                )}
              </div>
            ) : (
              <div className="posts-grid">
                {posts.map((post) => (
                  <PostCard key={post.id} post={post} />
                ))}
              </div>
            )}
          </div>
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
