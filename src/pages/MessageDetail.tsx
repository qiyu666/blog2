import { useEffect, useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import type { Message } from '../types'
import { getMessage, deleteMessage } from '../api'
import { useAuth } from '../auth/AuthContext'

export default function MessageDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user, refreshUnread } = useAuth()
  const [msg, setMsg] = useState<Message | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!id) return
    setLoading(true)
    getMessage(Number(id))
      .then((data) => {
        setMsg(data)
        setLoading(false)
        refreshUnread()
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : '加载失败')
        setLoading(false)
      })
  }, [id, refreshUnread])

  async function handleDelete() {
    if (!msg) return
    if (!confirm('删除这封信？')) return
    try {
      await deleteMessage(msg.id)
      navigate('/mailbox')
    } catch (err) {
      alert(err instanceof Error ? err.message : '删除失败')
    }
  }

  if (loading) return <div className="loading">加载中</div>
  if (error || !msg)
    return (
      <div className="error-state">
        <h2 className="error-state__title">信件不存在</h2>
        <p className="error-state__msg">
          <Link to="/mailbox" style={{ color: 'var(--accent)' }}>
            ← 返回站内信
          </Link>
        </p>
      </div>
    )

  const isIncoming = msg.to_id === user?.id
  const peer = isIncoming ? msg.from_username : msg.to_username
  const peerAvatar = isIncoming ? msg.from_avatar : msg.to_avatar
  const direction = isIncoming ? '来自' : '发给'

  return (
    <article className="form-page message-detail">
      <Link to="/mailbox" className="back-link">
        ← 返回站内信
      </Link>

      <div className="message-detail__head">
        <div className="message-detail__avatar">
          {peerAvatar ? (
            <img src={peerAvatar} alt={peer} loading="lazy" width={48} height={48} />
          ) : (
            <span className="comment__avatar-fallback">
              {(peer || '?').charAt(0).toUpperCase()}
            </span>
          )}
        </div>
        <div>
          <div className="message-detail__peer">
            {direction} @{peer}
          </div>
          <div className="message-detail__time">
            {new Date(msg.created_at + 'Z').toLocaleString('zh-CN', {
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
            {msg.read_at && isIncoming && (
              <span className="message-detail__read">· 已读</span>
            )}
          </div>
        </div>
      </div>

      <h1 className="form-page__title message-detail__subject">{msg.subject}</h1>

      <div className="message-detail__body">{msg.content}</div>

      <div className="form__actions">
        {isIncoming && (
          <Link
            to={`/mailbox/new?to=${encodeURIComponent(peer || '')}`}
            className="btn-primary"
          >
            回复
          </Link>
        )}
        <button type="button" className="btn-delete" onClick={handleDelete}>
          删除
        </button>
      </div>
    </article>
  )
}
