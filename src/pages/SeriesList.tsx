import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getSeriesList, type Series } from '../api'
import SEO from '../components/SEO'

export default function SeriesList() {
  const [series, setSeries] = useState<Series[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    getSeriesList()
      .then(setSeries)
      .catch((e) => setError(e.message || '加载失败'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="loading">加载中</div>
  if (error) return <div className="error-state"><h2>加载失败</h2><p>{error}</p></div>

  return (
    <div className="container">
      <SEO title="合集" description="文章系列与专栏" />
      <div className="section-header">
        <h1 className="section-header__title">合集 / 专栏</h1>
        <span className="section-header__count">{series.length} 个</span>
      </div>

      {series.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state__icon">📚</div>
          <p>还没有合集</p>
        </div>
      ) : (
        <div className="series-grid">
          {series.map((s) => (
            <Link key={s.id} to={`/series/${s.slug}`} className="series-card">
              {s.cover_image && (
                <div className="series-card__cover">
                  <img src={s.cover_image} alt={s.title} loading="lazy" />
                </div>
              )}
              <div className="series-card__body">
                <h3 className="series-card__title">{s.title}</h3>
                {s.description && <p className="series-card__desc">{s.description}</p>}
                <div className="series-card__meta">
                  <span>📚 {s.posts_count ?? 0} 篇</span>
                  {s.author_username && <span>· @{s.author_username}</span>}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
