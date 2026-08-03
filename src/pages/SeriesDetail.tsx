import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getSeries, type Series, type SeriesPost } from '../api'
import SEO from '../components/SEO'

function formatDate(dateStr: string): string {
  return new Date(dateStr + 'Z').toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
}

export default function SeriesDetail() {
  const { slug } = useParams<{ slug: string }>()
  const [series, setSeries] = useState<Series | null>(null)
  const [posts, setPosts] = useState<SeriesPost[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!slug) return
    setLoading(true)
    getSeries(slug)
      .then((data) => {
        setSeries(data.series)
        setPosts(data.posts)
      })
      .catch((e) => setError(e.message || '加载失败'))
      .finally(() => setLoading(false))
  }, [slug])

  if (loading) return <div className="loading">加载中</div>
  if (error) return <div className="error-state"><h2>加载失败</h2><p>{error}</p></div>
  if (!series) return null

  return (
    <div className="container">
      <SEO title={series.title} description={series.description} type="article" />

      <Link to="/series" className="back-link">← 全部合集</Link>

      <header className="series-header">
        {series.cover_image && (
          <div className="series-header__cover">
            <img src={series.cover_image} alt={series.title} loading="lazy" />
          </div>
        )}
        <h1 className="series-header__title">{series.title}</h1>
        {series.description && <p className="series-header__desc">{series.description}</p>}
        <div className="series-header__meta">
          <span>📚 {posts.length} 篇文章</span>
          {series.author_username && <span>· 编辑：@{series.author_username}</span>}
        </div>
      </header>

      {posts.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state__icon">📝</div>
          <p>该合集暂无文章</p>
        </div>
      ) : (
        <ol className="series-posts">
          {posts.map((p, idx) => (
            <li key={p.id} className="series-post-item">
              <span className="series-post-item__index">{idx + 1}</span>
              <Link to={`/post/${p.slug}`} className="series-post-item__body">
                <h3 className="series-post-item__title">{p.title}</h3>
                {p.excerpt && <p className="series-post-item__excerpt">{p.excerpt}</p>}
                <div className="series-post-item__meta">
                  <span>📅 {formatDate(p.created_at)}</span>
                  <span>👁 {p.views ?? 0}</span>
                  <span>❤️ {p.likes_count ?? 0}</span>
                  <span>💬 {p.comments_count ?? 0}</span>
                </div>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
