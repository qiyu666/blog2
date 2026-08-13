import { useEffect, useState, useMemo, useRef } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { getUserProfile, toggleFollow, getUserActivity, type UserProfile, type ActivityItem } from '../api'
import { useAuth } from '../auth/AuthContext'
import SEO from '../components/SEO'
import SocialLinksBase from '../components/SocialLinks'

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
  const [profileTab, setProfileTab] = useState<'posts' | 'activity'>('posts')

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
    setProfileTab('posts')
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

                <SocialLinks user={user} isOwn={isOwnProfile} />

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
            username={user.username}
            profileTab={profileTab}
            onTabChange={setProfileTab}
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
  username: string
  profileTab: 'posts' | 'activity'
  onTabChange: (tab: 'posts' | 'activity') => void
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
  username,
  profileTab,
  onTabChange,
}: ProfilePostsProps) {
  const filtered =
    activeCategory === '全部'
      ? posts
      : posts.filter((p) => p.category === activeCategory)
  const visible = filtered.slice(0, visibleCount)
  const hasMore = visibleCount < filtered.length

  return (
    <div className="profile-posts" key="posts">
      <div className="profile-posts__tabs">
        <button
          type="button"
          className={`profile-posts__tab${profileTab === 'posts' ? ' profile-posts__tab--active' : ''}`}
          onClick={() => onTabChange('posts')}
        >
          {isOwnProfile ? '我的文章' : `${displayName} 的文章`}
        </button>
        <button
          type="button"
          className={`profile-posts__tab${profileTab === 'activity' ? ' profile-posts__tab--active' : ''}`}
          onClick={() => onTabChange('activity')}
        >
          活动
        </button>
      </div>

      {profileTab === 'activity' ? (
        <ActivityTimeline username={username} isOwnProfile={isOwnProfile} />
      ) : (
        <>
          <div className="profile-posts__header">
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
        </>
      )}
    </div>
  )
}

// ===== 用户活动时间线 =====
interface ActivityTimelineProps {
  username: string
  isOwnProfile: boolean
}

function ActivityTimeline({ username, isOwnProfile }: ActivityTimelineProps) {
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    getUserActivity(username)
      .then((items) => {
        if (!cancelled) {
          setActivities(items)
          setLoading(false)
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message || '加载失败')
          setLoading(false)
        }
      })
    return () => {
      cancelled = true
    }
  }, [username])

  if (loading) return <div className="loading">加载中</div>
  if (error) return <div className="profile-posts__empty">{error}</div>
  if (activities.length === 0) {
    return (
      <div className="profile-posts__empty">
        <div className="empty-state__icon">📊</div>
        <p>{isOwnProfile ? '你还没有活动记录' : 'TA还没有活动记录'}</p>
      </div>
    )
  }

  const typeMeta: Record<ActivityItem['type'], { icon: string; verb: string }> = {
    post: { icon: '📝', verb: '发布了' },
    comment: { icon: '💬', verb: '评论了' },
    like: { icon: '❤️', verb: '赞了' },
    favorite: { icon: '⭐', verb: '收藏了' },
  }

  return (
    <div className="activity-timeline">
      {activities.map((item, idx) => {
        const meta = typeMeta[item.type]
        const link = item.target_slug ? `/post/${item.target_slug}` : '#'
        return (
          <div className="activity-timeline__item" key={`${item.type}-${item.target_id}-${idx}`}>
            <span className="activity-timeline__icon">{meta.icon}</span>
            <div className="activity-timeline__body">
              <span className="activity-timeline__verb">{meta.verb}</span>
              {item.target_slug ? (
                <Link to={link} className="activity-timeline__target">
                  {item.target_title}
                </Link>
              ) : (
                <span className="activity-timeline__target">{item.target_title}</span>
              )}
              <span className="activity-timeline__time">{formatDate(item.created_at)}</span>
            </div>
          </div>
        )
      })}
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

// ===== 社交联系方式（包装共享组件，处理本人主页空态提示） =====
interface SocialLinksProps {
  user: {
    social_github?: string
    social_twitter?: string
    social_qq?: string
    social_wechat?: string
    social_telegram?: string
    social_bilibili?: string
    social_email?: string
    social_facebook?: string
  }
  isOwn?: boolean
}

function SocialLinks({ user, isOwn }: SocialLinksProps) {
  const hasAny =
    !!(user.social_github?.trim() ||
      user.social_twitter?.trim() ||
      user.social_qq?.trim() ||
      user.social_wechat?.trim() ||
      user.social_telegram?.trim() ||
      user.social_bilibili?.trim() ||
      user.social_email?.trim() ||
      user.social_facebook?.trim())

  // 他人主页且无链接：不显示
  if (!hasAny && !isOwn) return null

  // 本人主页且无链接：显示编辑提示
  if (!hasAny && isOwn) {
    return (
      <div className="profile-social-empty">
        还没有添加社交联系方式，<Link to="/settings">去设置页添加</Link> →
      </div>
    )
  }

  return <SocialLinksBase user={user} />
}
