import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { getFollowingFeed } from '../api'
import type { FeedPost } from '../api'
import { useAuth } from '../auth/AuthContext'
import SEO from '../components/SEO'

function formatRelative(dateStr: string): string {
  const d = new Date(dateStr + 'Z')
  const now = Date.now()
  const diff = now - d.getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return '刚刚'
  if (min < 60) return `${min}分钟前`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}小时前`
  const day = Math.floor(hr / 24)
  if (day < 30) return `${day}天前`
  return d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
}

export default function FollowingFeed() {
  const { user } = useAuth()
  const [posts, setPosts] = useState<FeedPost[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [hasMore, setHasMore] = useState(false)
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [loadingMore, setLoadingMore] = useState(false)

  const loadFeed = useCallback((cursor?: string) => {
    if (!user) return
    setLoading(!cursor)
    setLoadingMore(!!cursor)
    setError('')
    getFollowingFeed(cursor)
      .then((data) => {
        setPosts((prev) => (cursor ? [...prev, ...data.posts] : data.posts))
        setHasMore(data.has_more)
        setNextCursor(data.next_cursor)
      })
      .catch((err) => {
        setError(err.message || '加载失败')
      })
      .finally(() => {
        setLoading(false)
        setLoadingMore(false)
      })
  }, [user])

  useEffect(() => {
    if (!user) return
    loadFeed()
  }, [user, loadFeed])

  if (!user) {
    return (
      <div className="auth-required">
        <SEO title="关注动态" description="查看你关注用户的最新文章" />
        <h2>请先登录</h2>
        <p>登录后即可查看你关注用户的最新动态。</p>
        <Link to="/login" className="btn-primary">去登录</Link>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="following-feed">
        <SEO title="关注动态" description="查看你关注用户的最新文章" />
        <div className="loading">加载中...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="following-feed">
        <SEO title="关注动态" description="查看你关注用户的最新文章" />
        <div className="error-state">
          <h2>加载失败</h2>
          <p>{error}</p>
          <button onClick={() => loadFeed()} className="btn-primary">重试</button>
        </div>
      </div>
    )
  }

  return (
    <div className="following-feed">
      <SEO title="关注动态" description="查看你关注用户的最新文章" />
      <div className="following-feed__header">
        <h1 className="following-feed__title">关注动态</h1>
        <p className="following-feed__desc">这里展示你关注的用户发布的最新文章</p>
      </div>

      {posts.length === 0 ? (
        <div className="following-feed__empty">
          <p>还没有关注任何人</p>
          <p className="following-feed__empty-hint">去探索页面发现有趣的用户和文章吧！</p>
          <Link to="/" className="btn-primary">浏览文章</Link>
        </div>
      ) : (
        <>
          <ul className="following-feed__list">
            {posts.map((post) => (
              <li key={post.id} className="following-feed__item">
                <div className="following-feed__item-header">
                  <Link to={`/${post.author_username}`} className="following-feed__author">
                    {post.author_avatar ? (
                      <img
                        src={post.author_avatar}
                        alt={post.author_username}
                        className="following-feed__avatar"
                        loading="lazy"
                        width={40}
                        height={40}
                      />
                    ) : (
                      <span className="following-feed__avatar-fallback">
                        {post.author_username.charAt(0).toUpperCase()}
                      </span>
                    )}
                    <span className="following-feed__author-name">@{post.author_username}</span>
                  </Link>
                  <span className="following-feed__time">{formatRelative(post.created_at)}</span>
                </div>
                <Link to={`/post/${post.slug}`} className="following-feed__content">
                  {post.category && (
                    <span className="following-feed__category">{post.category}</span>
                  )}
                  <h2 className="following-feed__title">{post.title}</h2>
                  {post.excerpt && (
                    <p className="following-feed__excerpt">{post.excerpt}</p>
                  )}
                  {post.cover_image && (
                    <div className="following-feed__cover">
                      <img
                        src={post.cover_image}
                        alt={post.title}
                        loading="lazy"
                        className="following-feed__cover-img"
                      />
                    </div>
                  )}
                  <div className="following-feed__meta">
                    <span>👁 {post.views}</span>
                    <span>❤️ {post.likes_count}</span>
                    <span>💬 {post.comments_count}</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>

          {hasMore && (
            <div className="following-feed__load-more">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => loadFeed(nextCursor || undefined)}
                disabled={loadingMore}
              >
                {loadingMore ? '加载中...' : '加载更多'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
