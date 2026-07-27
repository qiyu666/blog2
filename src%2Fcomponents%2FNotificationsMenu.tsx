import { useEffect, useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { getNotifications, markNotificationsRead } from '../api'
import type { NotificationItem } from '../types'

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

function describeNotification(n: NotificationItem): { text: string; link?: string } {
  const actor = n.actor_username ? `@${n.actor_username}` : '系统'
  switch (n.type) {
    case 'comment_reply':
      return {
        text: `${actor} 回复了你的评论`,
        link: n.post_slug ? `/post/${n.post_slug}` : undefined,
      }
    case 'post_comment':
      return {
        text: `${actor} 评论了你的帖子${n.post_title ? `「${n.post_title}」` : ''}`,
        link: n.post_slug ? `/post/${n.post_slug}` : undefined,
      }
    case 'like':
      return {
        text: `${actor} 赞了你的帖子${n.post_title ? `「${n.post_title}」` : ''}`,
        link: n.post_slug ? `/post/${n.post_slug}` : undefined,
      }
    case 'favorite':
      return {
        text: `${actor} 收藏了你的帖子${n.post_title ? `「${n.post_title}」` : ''}`,
        link: n.post_slug ? `/post/${n.post_slug}` : undefined,
      }
    case 'follow':
      return {
        text: `${actor} 关注了你`,
        link: n.actor_username ? `/${n.actor_username}` : undefined,
      }
    case 'message':
      return {
        text: `${actor} 给你发了一封站内信`,
        link: '/mailbox',
      }
    default:
      return { text: `${actor}：新动态` }
  }
}

export default function NotificationsMenu() {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<NotificationItem[]>([])
  const [loading, setLoading] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const ref = useRef<HTMLDivElement | null>(null)

  async function load() {
    setLoading(true)
    try {
      const data = await getNotifications('all')
      setItems(data)
      setUnreadCount(data.filter((n) => !n.read_at).length)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    const t = setInterval(load, 60_000)
    return () => clearInterval(t)
  }, [])

  // 点击外部关闭
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  async function handleToggle() {
    const willOpen = !open
    setOpen(willOpen)
    if (willOpen && unreadCount > 0) {
      // 打开时标记已读
      try {
        await markNotificationsRead({ all: true })
        setUnreadCount(0)
        setItems((prev) => prev.map((n) => n.read_at ? n : { ...n, read_at: new Date().toISOString() }))
      } catch {
        // ignore
      }
    }
  }

  return (
    <div className="notif-menu" ref={ref}>
      <button
        type="button"
        className={`notif-menu__btn ${unreadCount > 0 ? 'notif-menu__btn--active' : ''}`}
        onClick={handleToggle}
        aria-label="通知"
      >
        <span className="notif-menu__icon" aria-hidden>🔔</span>
        {unreadCount > 0 && (
          <span className="notif-menu__badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
        )}
      </button>

      {open && (
        <div className="notif-menu__panel" role="menu">
          <div className="notif-menu__header">
            <span>通知</span>
            {items.length > 0 && (
              <Link
                to="/notifications"
                className="notif-menu__view-all"
                onClick={() => setOpen(false)}
              >
                查看全部
              </Link>
            )}
          </div>
          <div className="notif-menu__list">
            {loading && items.length === 0 ? (
              <div className="notif-menu__empty">加载中…</div>
            ) : items.length === 0 ? (
              <div className="notif-menu__empty">暂无通知</div>
            ) : (
              items.slice(0, 8).map((n) => {
                const { text, link } = describeNotification(n)
                const content = (
                  <>
                    <div className="notif-item__avatar">
                      {n.actor_avatar ? (
                        <img src={n.actor_avatar} alt="" />
                      ) : (
                        <span>{n.actor_username?.charAt(0).toUpperCase() || '系'}</span>
                      )}
                    </div>
                    <div className="notif-item__body">
                      <p className="notif-item__text">{text}</p>
                      <span className="notif-item__time">{formatRelative(n.created_at)}</span>
                    </div>
                    {!n.read_at && <span className="notif-item__dot" aria-label="未读" />}
                  </>
                )
                return link ? (
                  <Link
                    key={n.id}
                    to={link}
                    className="notif-item"
                    onClick={() => setOpen(false)}
                  >
                    {content}
                  </Link>
                ) : (
                  <div key={n.id} className="notif-item">{content}</div>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
