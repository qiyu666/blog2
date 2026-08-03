import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import SEO from '../components/SEO'
import { getArchives, type ArchiveGroup } from '../api'

const MONTH_NAMES = [
  '一月', '二月', '三月', '四月', '五月', '六月',
  '七月', '八月', '九月', '十月', '十一月', '十二月',
]

export default function Archives() {
  const [groups, setGroups] = useState<ArchiveGroup[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    getArchives()
      .then((data) => {
        setGroups(data.archives)
        setTotal(data.total)
        setLoading(false)
      })
      .catch((err) => {
        setError(err.message)
        setLoading(false)
      })
  }, [])

  return (
    <div className="container archives-page">
      <SEO title="归档 — Marginalia" description="按时间归档浏览所有文章" />
      <Link to="/" className="back-link">← 返回首页</Link>
      <h1 className="archives-page__title">归档</h1>
      <p className="archives-page__subtitle">共 {total} 篇文章，按时间倒序排列</p>

      {loading && <div className="loading">加载中…</div>}
      {error && <div className="form__error">{error}</div>}

      {!loading && !error && groups.length === 0 && (
        <div className="empty-state">
          <div className="empty-state__icon">📭</div>
          <p className="empty-state__msg">还没有文章</p>
        </div>
      )}

      <div className="archives-list">
        {groups.map((g) => (
          <section key={g.ym} className="archive-group">
            <header className="archive-group__header">
              <h2 className="archive-group__title">
                <span className="archive-group__year">{g.year}</span>
                <span className="archive-group__month">{MONTH_NAMES[g.month - 1]}</span>
              </h2>
              <span className="archive-group__count">{g.count} 篇</span>
            </header>
            <ul className="archive-group__posts">
              {g.posts.map((p) => (
                <li key={p.id} className="archive-post">
                  <Link to={`/post/${p.slug}`} className="archive-post__title">
                    {p.title}
                  </Link>
                  <span className="archive-post__meta">
                    <span className="archive-post__category">{p.category}</span>
                    {p.author_username && (
                      <>
                        <span className="archive-post__sep">·</span>
                        <Link to={`/${p.author_username}`} className="archive-post__author">
                          @{p.author_username}
                        </Link>
                      </>
                    )}
                    <span className="archive-post__sep">·</span>
                    <span className="archive-post__day">
                      {new Date(p.created_at + 'Z').getDate()} 日
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  )
}
