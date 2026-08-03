import { Link } from 'react-router-dom'
import { useReadingHistory, ReadingHistoryItem } from '../hooks/useReadingHistory'
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

export default function History() {
  const { history, remove, clear } = useReadingHistory()

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
