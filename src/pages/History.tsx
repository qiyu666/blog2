import { Link } from 'react-router-dom'
import { useReadingHistory, ReadingHistoryItem } from '../hooks/useReadingHistory'
import { getCheckinStats } from '../api'
import { useEffect, useState } from 'react'
import SEO from '../components/SEO'

function timeAgo(ts: number): string {
  const diff = Date.now() - ts
  const min = Math.floor(diff / 60000)
  if (min < 1) return '刚刚'
  if (min < 60) return `${min} 分钟前`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr} 小时前`
  const day = Math.floor(hr / 24)
  if (day < 30) return `${day} 天前`
  return new Date(ts).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
}

function computeStats(history: ReadingHistoryItem[]) {
  if (history.length === 0) return null
  const now = Date.now()
  const dayMs = 86400000
  const weekAgo = now - 7 * dayMs
  const monthAgo = now - 30 * dayMs

  const weekItems = history.filter((h) => h.visited_at >= weekAgo)
  const monthItems = history.filter((h) => h.visited_at >= monthAgo)
  const completed = history.filter((h) => (h.read_progress ?? 0) >= 95)
  const avgProgress = history.reduce((s, h) => s + (h.read_progress ?? 0), 0) / history.length

  // 按天分组（最近7天）
  const dailyCounts: Array<{ day: string; count: number }> = []
  for (let i = 6; i >= 0; i--) {
    const dayStart = now - i * dayMs
    const dayDate = new Date(dayStart)
    const label = dayDate.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
    const count = history.filter((h) => {
      const d = new Date(h.visited_at)
      return d.getFullYear() === dayDate.getFullYear() &&
        d.getMonth() === dayDate.getMonth() &&
        d.getDate() === dayDate.getDate()
    }).length
    dailyCounts.push({ day: label, count })
  }
  const maxDaily = Math.max(...dailyCounts.map((d) => d.count), 1)

  // 按作者分组
  const authorMap = new Map<string, number>()
  history.forEach((h) => {
    if (h.author_username) {
      authorMap.set(h.author_username, (authorMap.get(h.author_username) || 0) + 1)
    }
  })
  const topAuthors = Array.from(authorMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)

  return {
    total: history.length,
    weekCount: weekItems.length,
    monthCount: monthItems.length,
    completedCount: completed.length,
    completionRate: Math.round((completed.length / history.length) * 100),
    avgProgress: Math.round(avgProgress),
    dailyCounts,
    maxDaily,
    topAuthors,
  }
}

export default function History() {
  const { history, remove, clear } = useReadingHistory()
  const stats = computeStats(history)
  const [checkin, setCheckin] = useState<{ streak: number; total_checkins: number } | null>(null)

  useEffect(() => {
    getCheckinStats().then(setCheckin).catch(() => {})
  }, [])

  return (
    <section className="posts-section">
      <SEO title="阅读历史 - Marginalia" description="你最近阅读过的文章" />
      <div className="container">
        <div className="section-header">
          <h2 className="section-header__title">阅读历史</h2>
          <span className="section-header__count">{history.length} 篇</span>
          {history.length > 0 && (
            <button
              type="button"
              className="history-clear-btn"
              onClick={() => {
                if (confirm('确定清空全部阅读历史？此操作不可撤销。')) clear()
              }}
            >
              清空历史
            </button>
          )}
        </div>

        {stats && (
          <div className="reading-stats">
            <div className="reading-stats__cards">
              <div className="reading-stats__card">
                <span className="reading-stats__value">{stats.total}</span>
                <span className="reading-stats__label">总阅读</span>
              </div>
              <div className="reading-stats__card">
                <span className="reading-stats__value">{stats.weekCount}</span>
                <span className="reading-stats__label">本周</span>
              </div>
              <div className="reading-stats__card">
                <span className="reading-stats__value">{stats.completedCount}</span>
                <span className="reading-stats__label">已读完</span>
              </div>
              <div className="reading-stats__card">
                <span className="reading-stats__value">{stats.completionRate}%</span>
                <span className="reading-stats__label">完成率</span>
              </div>
              <div className="reading-stats__card">
                <span className="reading-stats__value">{stats.avgProgress}%</span>
                <span className="reading-stats__label">平均进度</span>
              </div>
              {checkin !== null && (
                <>
                  <div className="reading-stats__card">
                    <span className="reading-stats__value">{checkin.streak}</span>
                    <span className="reading-stats__label">连续天数</span>
                  </div>
                  <div className="reading-stats__card">
                    <span className="reading-stats__value">{checkin.total_checkins}</span>
                    <span className="reading-stats__label">打卡次数</span>
                  </div>
                </>
              )}
            </div>

            {/* 7 天阅读趋势 */}
            <div className="reading-stats__chart">
              <h3 className="reading-stats__chart-title">近 7 天阅读趋势</h3>
              <div className="reading-stats__bars">
                {stats.dailyCounts.map((d) => (
                  <div key={d.day} className="reading-stats__bar-group">
                    <div className="reading-stats__bar-track">
                      <div
                        className="reading-stats__bar-fill"
                        style={{ height: `${(d.count / stats.maxDaily) * 100}%` }}
                      />
                    </div>
                    <span className="reading-stats__bar-value">{d.count}</span>
                    <span className="reading-stats__bar-label">{d.day}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 常读作者 */}
            {stats.topAuthors.length > 0 && (
              <div className="reading-stats__authors">
                <h3 className="reading-stats__chart-title">常读作者</h3>
                <ul className="reading-stats__author-list">
                  {stats.topAuthors.map(([name, count]) => (
                    <li key={name} className="reading-stats__author-item">
                      <Link to={`/${name}`} className="reading-stats__author-link">@{name}</Link>
                      <span className="reading-stats__author-count">{count} 篇</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {history.length === 0 ? (
          <div className="error-state">
            <h2 className="error-state__title">还没有阅读记录</h2>
            <p className="error-state__msg">
              <Link to="/" style={{ color: 'var(--accent)' }}>
                去读点什么 →
              </Link>
            </p>
          </div>
        ) : (
          <ul className="history-list">
            {history.map((item: ReadingHistoryItem) => (
              <li key={item.slug} className="history-item">
                <Link to={`/post/${item.slug}`} className="history-item__main">
                  {item.cover_image && (
                    <div className="history-item__cover">
                      <img src={item.cover_image} alt={item.title} loading="lazy" />
                    </div>
                  )}
                  <div className="history-item__body">
                    <h3 className="history-item__title">{item.title}</h3>
                    {item.excerpt && <p className="history-item__excerpt">{item.excerpt}</p>}
                    <div className="history-item__meta">
                      {item.author_username && (
                        <span className="history-item__author">@{item.author_username}</span>
                      )}
                      <span className="history-item__time">{timeAgo(item.visited_at)}</span>
                      {typeof item.read_progress === 'number' && item.read_progress > 0 && item.read_progress < 100 && (
                        <span className="history-item__progress">
                          已读 {item.read_progress}% · 继续阅读
                        </span>
                      )}
                    </div>
                    {typeof item.read_progress === 'number' && item.read_progress > 0 && item.read_progress < 100 && (
                      <div className="history-item__progress-bar">
                        <div className="history-item__progress-fill" style={{ width: `${item.read_progress}%` }} />
                      </div>
                    )}
                  </div>
                </Link>
                <button
                  type="button"
                  className="history-item__remove"
                  title="移除记录"
                  onClick={(e) => {
                    e.preventDefault()
                    remove(item.slug)
                  }}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
