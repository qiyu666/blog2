import { useEffect, useState, useMemo, useRef } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { getUserProfile, type UserProfile } from '../api'
import { useAuth } from '../auth/AuthContext'
import PostCard from '../components/PostCard'

function formatDate(dateStr: string): string {
  return new Date(dateStr + 'Z').toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export default function UserProfile() {
  const { username } = useParams<{ username: string }>()
  const { user: currentUser } = useAuth()
  const navigate = useNavigate()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const styleRef = useRef<HTMLStyleElement | null>(null)

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

  return (
    <div
      className="user-profile"
      data-profile={user.username}
      style={profileStyle}
    >
      <div className="user-profile__header">
        <div className="user-profile__avatar">
          {user.avatar ? (
            <img src={user.avatar} alt={displayName} />
          ) : (
            <div className="user-profile__avatar-fallback">
              {displayName.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <div className="user-profile__info">
          <h1 className="user-profile__name">{displayName}</h1>
          <p className="user-profile__username">@{user.username}</p>
          {user.bio && <p className="user-profile__bio">{user.bio}</p>}
          <div className="user-profile__meta">
            {user.location && (
              <span className="user-profile__meta-item">📍 {user.location}</span>
            )}
            {user.website && (
              <a
                href={user.website}
                target="_blank"
                rel="noopener noreferrer"
                className="user-profile__meta-item"
              >
                🔗 {user.website.replace(/^https?:\/\//, '')}
              </a>
            )}
            <span className="user-profile__meta-item">
              📅 加入于 {formatDate(user.created_at)}
            </span>
          </div>
          <div className="user-profile__stats">
            <div className="user-profile__stat">
              <strong>{stats.posts_count}</strong>
              <span>帖子</span>
            </div>
            <div className="user-profile__stat">
              <strong>{stats.comments_count}</strong>
              <span>评论</span>
            </div>
            <div className="user-profile__stat">
              <strong>{stats.total_likes_received}</strong>
              <span>获赞</span>
            </div>
            <div className="user-profile__stat">
              <strong>{stats.total_favorites_received}</strong>
              <span>收藏</span>
            </div>
          </div>
          {isOwnProfile && (
            <div className="user-profile__actions">
              <button
                type="button"
                className="btn-primary"
                onClick={() => navigate('/settings')}
              >
                编辑资料
              </button>
              <Link
                to="/mailbox/new"
                className="btn-secondary"
                style={{ textDecoration: 'none' }}
              >
                站内信
              </Link>
            </div>
          )}
          {!isOwnProfile && currentUser && (
            <div className="user-profile__actions">
              <Link
                to={`/mailbox/new?to=${encodeURIComponent(user.username)}`}
                className="btn-primary"
                style={{ textDecoration: 'none' }}
              >
                发站内信
              </Link>
            </div>
          )}
        </div>
      </div>

      <div className="user-profile__posts">
        <h2 className="user-profile__posts-title">
          {isOwnProfile ? '我的帖子' : `${displayName} 的帖子`}
          <span className="user-profile__posts-count">{posts.length}</span>
        </h2>
        {posts.length === 0 ? (
          <div className="error-state">
            <p className="error-state__msg">还没有发布过帖子</p>
          </div>
        ) : (
          <div className="posts-grid">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        )}
      </div>
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
