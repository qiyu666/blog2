import { useEffect, useState, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import type { Message } from '../types'
import { getMessages, deleteMessage } from '../api'
import { useAuth } from '../auth/AuthContext'
import { useTranslation } from 'react-i18next'

type Box = 'inbox' | 'sent'

function formatTime(dateStr: string): string {
  const d = new Date(dateStr + 'Z')
  const now = Date.now()
  const diff = now - d.getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return '刚刚'
  if (min < 60) return `${min} 分钟前`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr} 小时前`
  const day = Math.floor(hr / 24)
  if (day < 7) return `${day} 天前`
  return d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
}

export default function Mailbox() {
  const { refreshUnread } = useAuth()
  const { t } = useTranslation()
  const [box, setBox] = useState<Box>('inbox')
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [toast, setToast] = useState<string | null>(null)
  const prevCountRef = useRef(0)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await getMessages(box)
      if (box === 'inbox' && prevCountRef.current > 0 && data.length > prevCountRef.current) {
        setToast(t('mailbox.newMessage'))
        setTimeout(() => setToast(null), 3000)
      }
      prevCountRef.current = data.length
      setMessages(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败')
    } finally {
      setLoading(false)
    }
  }, [box, t])

  // 初始加载
  useEffect(() => {
    prevCountRef.current = 0
    load()
  }, [load])

  // 仅收件箱时自动轮询，每 5 秒一次；切出标签页时暂停
  useEffect(() => {
    if (box !== 'inbox') return
    const interval = setInterval(() => {
      if (!document.hidden) load()
    }, 2000)
    return () => clearInterval(interval)
  }, [box, load])

  async function handleDelete(id: number) {
    if (!confirm('删除这封信？')) return
    try {
      await deleteMessage(id)
      setMessages((prev) => prev.filter((m) => m.id !== id))
      prevCountRef.current = messages.length - 1
      refreshUnread()
    } catch (err) {
      alert(err instanceof Error ? err.message : '删除失败')
    }
  }

  return (
    <div className="form-page mailbox">
      {toast && <div className="toast toast--success">{toast}</div>}
      <div className="mailbox__head">
        <div>
          <h1 className="form-page__title">站内信</h1>
          <p className="form-page__subtitle">
            站内成员之间的私信。如需站外邮箱，请前往{' '}
            <a
              href="https://mail.qiyu666.dpdns.org"
              target="_blank"
              rel="noreferrer"
              className="inline-link"
            >
              mail.qiyu666.dpdns.org
            </a>
          </p>
        </div>
        <Link to="/mailbox/new" className="btn-primary">
          写信
        </Link>
      </div>

      <div className="mailbox__tabs">
        <button
          type="button"
          className={`mailbox__tab ${box === 'inbox' ? 'mailbox__tab--active' : ''}`}
          onClick={() => setBox('inbox')}
        >
          收件箱
        </button>
        <button
          type="button"
          className={`mailbox__tab ${box === 'sent' ? 'mailbox__tab--active' : ''}`}
          onClick={() => setBox('sent')}
        >
          已发送
        </button>
      </div>

      {loading ? (
        <div className="loading">加载中</div>
      ) : error ? (
        <div className="form__error">{error}</div>
      ) : messages.length === 0 ? (
        <p className="comments__empty">
          {box === 'inbox' ? '收件箱为空。' : '还没有发送过信件。'}
        </p>
      ) : (
        <ul className="mail-list">
          {messages.map((m) => {
            const isinbox = box === 'inbox'
            const peer = isinbox ? m.from_username : m.to_username
            const peerAvatar = isinbox ? m.from_avatar : m.to_avatar
            const unread = isinbox && !m.read_at
            return (
              <li
                key={m.id}
                className={`mail-item ${unread ? 'mail-item--unread' : ''}`}
              >
                <Link to={`/mailbox/${m.id}`} className="mail-item__main">
                  <div className="mail-item__avatar">
                    {peerAvatar ? (
                      <img src={peerAvatar} alt={peer} loading="lazy" width={40} height={40} />
                    ) : (
                      <span className="comment__avatar-fallback">
                        {(peer || '?').charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="mail-item__body">
                    <div className="mail-item__head">
                      <span className="mail-item__peer">
                        {isinbox ? '来自' : '发给'} @{peer}
                      </span>
                      {unread && <span className="mail-item__dot" />}
                      <span className="mail-item__time">{formatTime(m.created_at)}</span>
                    </div>
                    <span className="mail-item__subject">{m.subject}</span>
                    <span className="mail-item__preview">{m.content}</span>
                  </div>
                </Link>
                <button
                  type="button"
                  className="mail-item__delete"
                  onClick={() => handleDelete(m.id)}
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
