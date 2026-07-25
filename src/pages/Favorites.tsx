import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type { Post } from '../types'
import { getFavorites } from '../api'
import PostCard from '../components/PostCard'

export default function Favorites() {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    getFavorites()
      .then((data) => {
        setPosts(data)
        setLoading(false)
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : '加载失败')
        setLoading(false)
      })
  }, [])

  return (
    <section className="posts-section">
      <div className="container">
        <div className="section-header">
          <h2 className="section-header__title">我的收藏</h2>
          <span className="section-header__count">{posts.length} 篇</span>
        </div>

        {loading ? (
          <div className="loading">加载中</div>
        ) : error ? (
          <div className="form__error">{error}</div>
        ) : posts.length === 0 ? (
          <div className="error-state">
            <h2 className="error-state__title">还没有收藏</h2>
            <p className="error-state__msg">
              <Link to="/" style={{ color: 'var(--accent)' }}>
                去论坛看看 →
              </Link>
            </p>
          </div>
        ) : (
          <div className="posts-grid">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
