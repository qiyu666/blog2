import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getNotifications, markNotificationsRead, deleteNotification } from '../api'
import type { NotificationItem } from '../types'
import { useAuth } from '../auth/AuthContext'

function formatRelative(dateStr: string): string {
  const d = new Date(dateStr + 'Z')
  const diff = Date.now() - d.getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return '刚刚'
  if (min < 60) return `${min} 分钟前`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr} 小时前`
  const day = Math.floor(hr / 24)
  if (day < 30) return `${day} 天前`
  return d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
}

function describe(n: NotificationItem): { text: string; link?: string } {
  const actor = n.actor_username ? `@${n.actor_username}` : '系统'
  switch (n.type) {
    case 'comment_reply':
      return { text: `${actor} 回复了你的评论`, link: n.post_slug ? `/post/${n.post_slug}` : undefined }
    case 'post_comment':
      return { text: `${actor} 评论了你的帖子${n.post_title ? `「${n.post_title}」` : ''}`, link: n.post_slug ? `/post/${n.post_slug}` : undefined }
    case 'like':
      return { text: `${actor} 赞了你的帖子${n.post_title ? `「${n.post_title}」` : ''}`, link: n.post_slug ? `/post/${n.post_slug}` : undefined }
    case 'favorite':
      return { text: `${actor} 收藏了你的帖子${n.post_title ? `「${n.post_title}」` : ''}`, link: n.post_slug ? `/post/${n.post_slug}` : undefined }
    case 'follow':
      return { text: `${actor} 关注了你`, link: n.actor_username ? `/${n.actor_username}` : undefined }
    case 'message':
      return { text: `${actor} 给你发了一封站内信`, link: '/mailbox' }
    case 'system':
      return { text: `${actor} 在评论中提及了你`, link: n.post_slug ? `/post/${n.post_slug}` : undefined }
    default:
      return { text: `${actor}：新动态` }
  }
}

export default function Notifications() {
  const { user } = useAuth()
  const [items, setItems] = useState<NotificationItem[]>([])
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    try {
      const data = await getNotifications('all')
      setItems(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user) load()
  }, [user])

  async function handleMarkAll() {
    await markNotificationsRead({ all: true })
    setItems((prev) => prev.map((n) => n.read_at ? n : { ...n, read_at: new Date().toISOString() }))
  }

  async function handleDelete(id: number) {
    await deleteNotification({ id })
    setItems((prev) => prev.filter((n) => n.id !== id))
  }

  if (!user) {
    return (
      <div className="error-state">
        <h2 className="error-state__title">请先登录</h2>
        <p className="error-state__msg">
          <Link to="/login" style={{ color: 'var(--accent)' }}>去登录</Link>
        </p>
      </div>
    )
  }

  return (
    <div className="container notif-page">
      <div className="notif-page__header">
        <h1 className="notif-page__title">通知</h1>
        {items.some((n) => !n.read_at) && (
          <button type="button" className="btn-secondary" onClick={handleMarkAll}>
            全部标为已读
          </button>
        )}
      </div>

      {loading ? (
        <div className="loading">加载中…</div>
      ) : items.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state__icon">🔔</div>
          <p className="empty-state__msg">暂无通知</p>
        </div>
      ) : (
        <ul className="notif-list">
          {items.map((n) => {
            const { text, link } = describe(n)
            return (
              <li
                key={n.id}
                className={`notif-list__item ${!n.read_at ? 'notif-list__item--unread' : ''}`}
              >
                <div className="notif-list__avatar">
                  {n.actor_avatar ? (
                    <img src={n.actor_avatar} alt="" loading="lazy" width={40} height={40} />
                  ) : (
                    <span>{n.actor_username?.charAt(0).toUpperCase() || '系'}</span>
                  )}
                </div>
                <div className="notif-list__body">
                  {link ? (
                    <Link to={link} className="notif-list__text">{text}</Link>
                  ) : (
                    <span className="notif-list__text">{text}</span>
                  )}
                  <span className="notif-list__time">{formatRelative(n.created_at)}</span>
                </div>
                <button
                  type="button"
                  className="notif-list__delete"
                  onClick={() => handleDelete(n.id)}
                  aria-label="删除"
                  title="删除"
                >
                  ×
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
