import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type { Post } from '../types'
import { getPosts } from '../api'
import PostCard from '../components/PostCard'

export default function Home() {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    getPosts()
      .then(data => {
        setPosts(data)
        setLoading(false)
      })
      .catch(err => {
        setError(err.message)
        setLoading(false)
      })
  }, [])

  if (loading) return <div className="loading">Loading the journal</div>
  if (error) return (
    <div className="error-state">
      <h2 className="error-state__title">Couldn't load posts</h2>
      <p className="error-state__msg">{error}</p>
    </div>
  )
  if (posts.length === 0) return (
    <div className="error-state">
      <h2 className="error-state__title">No posts yet</h2>
      <p className="error-state__msg">
        <Link to="/new" style={{ color: 'var(--accent)' }}>Write the first one</Link>
      </p>
    </div>
  )

  const featured = posts[0]
  const rest = posts.slice(1)

  return (
    <>
      {/* Hero */}
      <section className="hero">
        <div className="container">
          <div className="hero__decoration">M</div>
          <div className="hero__grid">
            <div>
              <div className="eyebrow" style={{ marginBottom: 'var(--space-sm)' }}>A Journal of Slow Ideas</div>
              <h1 className="display-xl hero__title">
                Essays from the<br /><em>margins</em>.
              </h1>
            </div>
            <div>
              <p className="hero__subtitle">
                Field notes on reading, writing, attention, and design.
                Published irregularly, read carefully — the way ideas
                were meant to be encountered.
              </p>
              <div className="hero__meta">
                <span className="hero__meta-line"></span>
                <span>{posts.length} entries · est. 2026</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Post */}
      {featured && (
        <section className="featured">
          <div className="container">
            <div className="featured__inner">
              <Link to={`/post/${featured.slug}`} className="featured__image">
                {featured.cover_image && <img src={featured.cover_image} alt={featured.title} />}
              </Link>
              <div className="featured__content">
                <span className="featured__category">Featured · {featured.category}</span>
                <h2 className="featured__title">
                  <Link to={`/post/${featured.slug}`}>{featured.title}</Link>
                </h2>
                <p className="featured__excerpt">{featured.excerpt}</p>
                <div className="featured__meta">
                  <span className="featured__author">{featured.author}</span>
                  <span>·</span>
                  <span>{new Date(featured.created_at + 'Z').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Posts Grid */}
      {rest.length > 0 && (
        <section className="posts-section">
          <div className="container">
            <div className="section-header">
              <h2 className="section-header__title">More from the journal</h2>
              <span className="section-header__count">{rest.length} entries</span>
            </div>
            <div className="posts-grid">
              {rest.map(post => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  )
}
