import { useState, useEffect, useRef, useCallback } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../auth/AuthContext'
import {
  getFriendRequests,
  createMessage,
  markMessagesAsRead,
  getMessagesByFriend,
  type Message,
  type FriendRequest,
} from '../api'
import SEO from '../components/SEO'

// 从 friend_requests 中提取好友列表（status=accepted 的记录）
function extractFriends(
  incoming: FriendRequest[],
  outgoing: FriendRequest[],
  currentUserId: number
): Array<{ userId: number; username: string; avatar: string | null; requestId: number }> {
  const map = new Map<number, { userId: number; username: string; avatar: string | null; requestId: number }>()
  for (const r of [...incoming, ...outgoing]) {
    if (r.status !== 'accepted') continue
    const friendId = Number(r.from_user_id) === currentUserId ? r.to_user_id : r.from_user_id
    const friendUsername = Number(r.from_user_id) === currentUserId ? r.to_username : r.from_username
    const friendAvatar = Number(r.from_user_id) === currentUserId ? r.to_avatar : r.from_avatar
    if (!map.has(friendId)) {
      map.set(friendId, { userId: friendId, username: friendUsername || '', avatar: friendAvatar || null, requestId: r.id })
    }
  }
  return Array.from(map.values())
}

export default function Mailbox() {
  const { user } = useAuth()
  const { t } = useTranslation()
  const [searchParams, setSearchParams] = useSearchParams()
  const [messages, setMessages] = useState<Message[]>([])
  const [sending, setSending] = useState(false)
  const [subject, setSubject] = useState('')
  const [content, setContent] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [friends, setFriends] = useState<Array<{ userId: number; username: string; avatar: string | null; requestId: number }>>([])
  const [friendCounts, setFriendCounts] = useState<Record<number, number>>({})
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // 获取与某好友的对话历史
  const loadConversation = useCallback(async (friendId: number) => {
    if (!user) return
    try {
      const data = await getMessagesByFriend(friendId)
      setMessages(data)
      markMessagesAsRead({ from_id: friendId })
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.failed'))
    }
  }, [user, t])

  // 加载好友列表和消息计数
  const loadFriends = useCallback(async () => {
    if (!user) return
    try {
      const data = await getFriendRequests()
      const friendList = extractFriends(data.incoming, data.outgoing, user.id)
      setFriends(friendList)

      // 为每个好友计算未读消息数
      const counts: Record<number, number> = {}
      for (const friend of friendList) {
        try {
          const msgs = await getMessagesByFriend(friend.userId)
          counts[friend.userId] = msgs.filter((m) => m.read_at === null).length
        } catch {
          counts[friend.userId] = 0
        }
      }
      setFriendCounts(counts)
    } catch (err) {
      console.error('Failed to load friends:', err)
    }
  }, [user])

  useEffect(() => {
    loadFriends()
  }, [loadFriends])

  // 当切换到某好友时加载对话历史
  useEffect(() => {
    const userIdParam = searchParams.get('user_id')
    if (userIdParam) {
      const userId = Number(userIdParam)
      setSelectedUserId(userId)
      loadConversation(userId)
    } else {
      setSelectedUserId(null)
      setMessages([])
    }
  }, [searchParams]) // eslint-disable-line react-hooks/exhaustive-deps

  // 切换好友时轮询新消息（3秒间隔）
  useEffect(() => {
    if (!selectedUserId) return
    loadConversation(selectedUserId)
    const interval = setInterval(() => loadConversation(selectedUserId), 3000)
    return () => clearInterval(interval)
  }, [selectedUserId]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault()
    if (!content.trim() || !selectedUserId || sending) return
    setSending(true)
    // 乐观更新：立即显示
    const optimisticMsg: Message = {
      id: Date.now(),
      subject: subject.trim() || t('messages.no_subject'),
      content: content.trim(),
      read_at: null,
      created_at: new Date().toISOString(),
      from_id: user?.id,
      from_username: user?.username,
      from_avatar: user?.avatar,
      to_id: selectedUserId,
    }
    setMessages((prev) => [...prev, optimisticMsg])
    const savedContent = content
    const savedSubject = subject
    setContent('')
    setSubject('')
    try {
      await createMessage(selectedUserId, savedSubject, savedContent)
      // 发送成功后立即重新加载，对齐服务端状态
      setTimeout(() => loadConversation(selectedUserId), 300)
    } catch (err) {
      setMessages((prev) => prev.filter((m) => m.id !== optimisticMsg.id))
      setContent(savedContent)
      setSubject(savedSubject)
      setError(err instanceof Error ? err.message : t('common.failed'))
    } finally {
      setSending(false)
    }
  }

  function selectFriend(userId: number) {
    setSearchParams({ user_id: String(userId) })
  }

  if (!user) {
    return (
      <div className="page">
        <SEO title={t('mailbox.title')} description={t('mailbox.description')} />
        <div className="card">
          <p>{t('messages.login_required')}</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <SEO title={t('mailbox.title')} description={t('mailbox.description')} />
      <div className="mailbox-page">
        <h1>{t('mailbox.title')}</h1>

        {error && <div className="error-msg">{error}</div>}

        <div className="mailbox-layout">
          {/* 好友列表侧边栏 */}
          <aside className="mailbox-sidebar">
            <h3>{t('messages.friends')} ({friends.length})</h3>
            {friends.length === 0 ? (
              <p className="empty-hint">
                {t('friends.no_friends')}
                <br />
                <Link to="/friends" className="link">{t('friends.go_manage')}</Link>
              </p>
            ) : (
              <ul className="friend-list">
                {friends.map((friend) => (
                  <li
                    key={friend.userId}
                    className={`friend-item${selectedUserId === friend.userId ? ' active' : ''}`}
                    onClick={() => selectFriend(friend.userId)}
                  >
                    <img
                      src={friend.avatar || `/api/users/${friend.username}/avatar`}
                      alt={friend.username}
                      className="avatar-sm"
                    />
                    <span className="friend-name">{friend.username}</span>
                    {(friendCounts[friend.userId] ?? 0) > 0 && (
                      <span className="unread-badge">{friendCounts[friend.userId]}</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </aside>

          {/* 对话区域 */}
          <main className="mailbox-main">
            {!selectedUserId ? (
              <div className="mailbox-empty">
                <p>{t('messages.select_friend')}</p>
              </div>
            ) : (
              <>
                <div className="mailbox-header">
                  <Link to={`/u/${friends.find((f) => f.userId === selectedUserId)?.username}`} className="mailbox-target">
                    <img
                      src={friends.find((f) => f.userId === selectedUserId)?.avatar || `/api/users/${friends.find((f) => f.userId === selectedUserId)?.username}/avatar`}
                      alt=""
                      className="avatar-md"
                    />
                    <span>{friends.find((f) => f.userId === selectedUserId)?.username}</span>
                  </Link>
                  <span className="mailbox-status">● {t('messages.typing_hint')}</span>
                </div>

                <div className="messages-list">
                  {messages.map((msg) => {
                    const isMine = msg.from_id === user.id
                    return (
                      <div key={msg.id} className={`message-item ${isMine ? 'mine' : 'theirs'}`}>
                        <img
                          src={isMine
                            ? (user.avatar || `/api/users/${user.username}/avatar`)
                            : (msg.from_avatar || `/api/users/${msg.from_username}/avatar`)
                          }
                          alt=""
                          className="avatar-xs"
                        />
                        <div className="message-bubble">
                          <div className="message-meta">
                            <span className="message-sender">{isMine ? t('common.you') : (msg.from_username || '?')}</span>
                            <span className="message-time">{new Date(msg.created_at + 'Z').toLocaleString('zh-CN')}</span>
                          </div>
                          <div className="message-content">{msg.content}</div>
                        </div>
                      </div>
                    )
                  })}
                  <div ref={messagesEndRef} />
                </div>

                <form className="message-form" onSubmit={sendMessage}>
                  <input
                    type="text"
                    className="input"
                    placeholder={t('messages.subject_placeholder')}
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                  />
                  <div className="message-form-row">
                    <textarea
                      className="input message-textarea"
                      placeholder={t('messages.placeholder')}
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      rows={3}
                    />
                    <button type="submit" className="btn btn-primary" disabled={sending || !content.trim()}>
                      {sending ? t('messages.sending') : t('messages.send')}
                    </button>
                  </div>
                </form>
              </>
            )}
          </main>
        </div>
      </div>
    </>
  )
}
