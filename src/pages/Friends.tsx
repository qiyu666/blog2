import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../auth/AuthContext'
import {
  getFriendRequests,
  handleFriendRequest,
  cancelFriendRequest,
  unfriend,
  type FriendRequest,
} from '../api'
import SEO from '../components/SEO'

export default function Friends() {
  const { user } = useAuth()
  const { t } = useTranslation()
  const [incoming, setIncoming] = useState<FriendRequest[]>([])
  const [outgoing, setOutgoing] = useState<FriendRequest[]>([])
  const [friends, setFriends] = useState<FriendRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getFriendRequests()
      setIncoming(data.incoming)
      setOutgoing(data.outgoing)
      // accepted 的请求中，当前用户是 to_user_id 的视为好友
      setFriends(data.outgoing.filter((r) => r.status === 'accepted'))
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.failed'))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => { load() }, [load])

  async function handleAccept(requestId: number) {
    setProcessingId(requestId)
    try {
      await handleFriendRequest(requestId, 'accept')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.failed'))
    } finally {
      setProcessingId(null)
    }
  }

  async function handleReject(requestId: number) {
    setProcessingId(requestId)
    try {
      await handleFriendRequest(requestId, 'reject')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.failed'))
    } finally {
      setProcessingId(null)
    }
  }

  async function handleCancel(requestId: number) {
    setProcessingId(requestId)
    try {
      await cancelFriendRequest(requestId)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.failed'))
    } finally {
      setProcessingId(null)
    }
  }

  async function handleUnfriend(requestId: number) {
    setProcessingId(requestId)
    try {
      await unfriend(requestId)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.failed'))
    } finally {
      setProcessingId(null)
    }
  }

  const pendingCount = incoming.length

  return (
    <>
      <SEO
        title={t('friends.title')}
        description={t('friends.description')}
      />
      <div className="friends-page">
        <h1>{t('friends.title')}</h1>

        {error && (
          <div className="error-msg">{error}</div>
        )}

        {loading ? (
          <div className="loading">{t('common.loading')}</div>
        ) : (
          <>
            {/* 接收到的请求 */}
            <section className="friends-section">
              <h2>{t('friends.requests_received')} {pendingCount > 0 && <span className="badge">{pendingCount}</span>}</h2>
              {incoming.length === 0 ? (
                <p className="empty-hint">{t('friends.no_requests')}</p>
              ) : (
                <div className="request-list">
                  {incoming.map((req) => (
                    <div key={req.id} className="request-card">
                      <Link to={`/u/${req.from_username}`} className="request-user">
                        <img
                          src={(req.from_avatar || `/api/users/${req.from_username}/avatar`)}
                          alt={req.from_username}
                          className="avatar-sm"
                        />
                        <span className="username">{req.from_username}</span>
                      </Link>
                      <div className="request-actions">
                        <button
                          className="btn btn-primary btn-sm"
                          disabled={processingId === req.id}
                          onClick={() => handleAccept(req.id)}
                        >
                          {processingId === req.id ? '...' : t('friends.accept')}
                        </button>
                        <button
                          className="btn btn-ghost btn-sm"
                          disabled={processingId === req.id}
                          onClick={() => handleReject(req.id)}
                        >
                          {t('friends.reject')}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* 发送中的请求 */}
            <section className="friends-section">
              <h2>{t('friends.requests_sent')}</h2>
              {outgoing.filter((r) => r.status === 'pending').length === 0 ? (
                <p className="empty-hint">{t('friends.no_pending')}</p>
              ) : (
                <div className="request-list">
                  {outgoing
                    .filter((r) => r.status === 'pending')
                    .map((req) => (
                      <div key={req.id} className="request-card">
                        <Link to={`/u/${req.to_username}`} className="request-user">
                          <img
                            src={(req.to_avatar || `/api/users/${req.to_username}/avatar`)}
                            alt={req.to_username}
                            className="avatar-sm"
                          />
                          <span className="username">{req.to_username}</span>
                        </Link>
                        <button
                          className="btn btn-ghost btn-sm"
                          disabled={processingId === req.id}
                          onClick={() => handleCancel(req.id)}
                        >
                          {t('friends.cancel')}
                        </button>
                      </div>
                    ))}
                </div>
              )}
            </section>

            {/* 好友列表 */}
            <section className="friends-section">
              <h2>{t('friends.my_friends')} ({friends.length})</h2>
              {friends.length === 0 ? (
                <p className="empty-hint">{t('friends.no_friends')}</p>
              ) : (
                <div className="friend-grid">
                  {friends.map((req) => {
                    const isMe = Number(req.from_user_id) === user?.id
                    const friend = isMe
                      ? { username: req.to_username, avatar: req.to_avatar }
                      : { username: req.from_username, avatar: req.from_avatar }
                    return (
                      <div key={req.id} className="friend-card">
                        <Link to={`/u/${friend.username}`} className="friend-user">
                          <img
                            src={friend.avatar || `/api/users/${friend.username}/avatar`}
                            alt={friend.username}
                            className="avatar-md"
                          />
                          <span className="friend-name">{friend.username}</span>
                        </Link>
                        <Link
                          to={`/mail?user=${encodeURIComponent(friend.username || '')}`}
                          className="btn btn-accent btn-sm"
                        >
                          {t('messages.send')}
                        </Link>
                        <button
                          className="btn btn-ghost btn-sm"
                          disabled={processingId === req.id}
                          onClick={() => handleUnfriend(req.id)}
                        >
                          {t('friends.unfriend')}
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </>
  )
}
