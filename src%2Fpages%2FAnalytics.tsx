import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getAnalytics, type AnalyticsData } from '../api'
import SEO from '../components/SEO'
import { useAuth } from '../auth/AuthContext'

function formatNumber(n: number): string {
  if (n >= 10000) return (n / 1000).toFixed(1) + 'k'
  return String(n)
}

function formatDay(day: string): string {
  // day arrives as YYYY-MM-DD (UTC). Show MM-DD.
  if (!day) return ''
  const parts = day.split('-')
  if (parts.length < 3) return day
  return `${parts[1]}-${parts[2]}`
}

/** Build a 30-day index so empty days still show up as zero-height bars. */
function fill30Days(data: { day: string; count: number }[]): { day: string; count: number }[] {
  const map = new Map<string, number>()
  for (const item of data) map.set(item.day, item.count)
  const out: { day: string; count: number }[] = []
  const today = new Date()
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today)
    d.setUTCDate(d.getUTCDate() - i)
    const key = d.toISOString().slice(0, 10)
    out.push({ day: key, count: map.get(key) ?? 0 })
  }
  return out
}

export default function Analytics() {
  const { user } = useAuth()
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)
    setError('')
    getAnalytics()
      .then((d) => {
        setData(d)
        setLoading(false)
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : '加载失败')
        setLoading(false)
      })
  }, [])

  if (user?.role !== 'admin') {
    return (
      <div className="error-state">
        <h2 className="error-state__title">无权访问</h2>
        <p className="error-state__msg">该页面仅限管理员访问。</p>
      </div>
    )
  }

  if (loading) return <div className="loading">加载中</div>
  if (error || !data)
    return (
      <div className="error-state">
        <h2 className="error-state__title">加载失败</h2>
        <p className="error-state__msg">{error || '暂无数据'}</p>
      </div>
    )

  const o = data.overview
  const categoryMax = Math.max(1, ...data.categoryDist.map((c) => c.count))
  const userGrowth = fill30Days(data.userGrowth)
  const postGrowth = fill30Days(data.postGrowth)
  const commentGrowth = fill30Days(data.commentGrowth)
  const growthMax = Math.max(
    1,
    ...userGrowth.map((d) => d.count),
    ...postGrowth.map((d) => d.count),
    ...commentGrowth.map((d) => d.count),
  )

  const overviewCards = [
    { label: '总用户', value: o.users, icon: '👥', color: 'var(--accent)' },
    { label: '总帖子', value: o.posts, icon: '📝', color: 'var(--sage)' },
    { label: '总评论', value: o.comments, icon: '💬', color: 'var(--gold)' },
    { label: '总点赞', value: o.likes, icon: '♥', color: '#ec4899' },
    { label: '总浏览', value: o.views, icon: '👁', color: '#6366f1' },
    { label: '待处理举报', value: o.pendingReports, icon: '⚑', color: '#b91c1c' },
  ]

  return (
    <div className="analytics-page">
      <SEO title="数据分析" description="Marginalia 数据分析仪表盘" />
      <div className="admin-page__header">
        <div className="admin-page__title-row">
          <div>
            <h1 className="admin-page__title">数据分析</h1>
            <p className="admin-page__subtitle">
              论坛整体运营指标。返回{' '}
              <Link to="/admin" className="inline-link">
                管理后台
              </Link>
              。
            </p>
          </div>
          <div className="admin-page__admin-badge">
            <span className="admin-page__admin-icon">📊</span>
            <span>分析</span>
          </div>
        </div>
      </div>

      {/* 概览卡片 */}
      <div className="admin-stats">
        {overviewCards.map((c) => (
          <div
            key={c.label}
            className="admin-stat"
            style={{ '--stat-color': c.color } as React.CSSProperties}
          >
            <div className="admin-stat__icon">{c.icon}</div>
            <div className="admin-stat__body">
              <div className="admin-stat__value">{formatNumber(c.value)}</div>
              <div className="admin-stat__label">{c.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* 分类分布 */}
      <section className="analytics-section">
        <h2 className="analytics-section__title">分类分布</h2>
        {data.categoryDist.length === 0 ? (
          <p className="analytics-empty">暂无数据</p>
        ) : (
          <div className="analytics-chart">
            {data.categoryDist.map((c) => (
              <div key={c.category} className="analytics-bar-row">
                <div className="analytics-bar-row__label">{c.category}</div>
                <div className="analytics-bar-row__track">
                  <div
                    className="analytics-bar analytics-bar--category"
                    style={{ width: `${(c.count / categoryMax) * 100}%` }}
                    title={`${c.count} 篇`}
                  />
                </div>
                <div className="analytics-bar-row__count">{c.count}</div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 增长趋势（最近 30 天） */}
      <section className="analytics-section">
        <h2 className="analytics-section__title">增长趋势（最近 30 天）</h2>
        <div className="analytics-growth-grid">
          <GrowthChart title="新增用户" data={userGrowth} max={growthMax} color="var(--accent)" />
          <GrowthChart title="新增帖子" data={postGrowth} max={growthMax} color="var(--sage)" />
          <GrowthChart title="新增评论" data={commentGrowth} max={growthMax} color="var(--gold)" />
        </div>
      </section>

      {/* 热门帖子 Top 10 */}
      <section className="analytics-section">
        <h2 className="analytics-section__title">热门帖子 前 10</h2>
        {data.topPosts.length === 0 ? (
          <p className="analytics-empty">暂无数据</p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>标题</th>
                  <th>浏览</th>
                  <th>点赞</th>
                  <th>评论</th>
                  <th>综合得分</th>
                </tr>
              </thead>
              <tbody>
                {data.topPosts.map((p, i) => (
                  <tr key={p.id}>
                    <td className="admin-table__num">{i + 1}</td>
                    <td className="admin-table__title">
                      <Link to={`/post/${p.slug}`}>{p.title}</Link>
                    </td>
                    <td className="admin-table__num">{formatNumber(p.views)}</td>
                    <td className="admin-table__num">{p.likes_count}</td>
                    <td className="admin-table__num">{p.comments_count}</td>
                    <td className="admin-table__num analytics-score">{formatNumber(p.score)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* 活跃用户 前 10 */}
      <section className="analytics-section">
        <h2 className="analytics-section__title">活跃用户 前 10</h2>
        {data.topUsers.length === 0 ? (
          <p className="analytics-empty">暂无数据</p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>用户</th>
                  <th>帖子数</th>
                </tr>
              </thead>
              <tbody>
                {data.topUsers.map((u, i) => (
                  <tr key={u.id}>
                    <td className="admin-table__num">{i + 1}</td>
                    <td className="admin-table__author">
                      <Link to={`/${u.username}`}>@{u.username}</Link>
                    </td>
                    <td className="admin-table__num">{u.post_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}

function GrowthChart({
  title,
  data,
  max,
  color,
}: {
  title: string
  data: { day: string; count: number }[]
  max: number
  color: string
}) {
  const total = data.reduce((s, d) => s + d.count, 0)
  return (
    <div className="analytics-growth-card">
      <div className="analytics-growth-card__head">
        <span className="analytics-growth-card__title">{title}</span>
        <span className="analytics-growth-card__total">合计 {total}</span>
      </div>
      <div className="analytics-growth-card__bars">
        {data.map((d) => (
          <div
            key={d.day}
            className="analytics-growth-bar"
            title={`${formatDay(d.day)}：${d.count}`}
            style={{
              height: `${(d.count / max) * 100}%`,
              background: d.count > 0 ? color : 'var(--line-soft)',
            }}
          />
        ))}
      </div>
      <div className="analytics-growth-card__axis">
        <span>{formatDay(data[0]?.day || '')}</span>
        <span>{formatDay(data[data.length - 1]?.day || '')}</span>
      </div>
    </div>
  )
}
