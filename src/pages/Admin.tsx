import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  getAdminUsers,
  getAdminPosts,
  getAdminComments,
  updateUserRole,
  deletePost,
  deleteComment,
  type AdminUser,
  type AdminPost,
  type AdminComment,
} from '../api'
import { useAuth } from '../auth/AuthContext'

type Tab = 'users' | 'posts' | 'comments'

function formatTime(dateStr: string): string {
  return new Date(dateStr + 'Z').toLocaleString('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function Admin() {
  const { user } = useAuth()
  const [tab, setTab] = useState<Tab>('users')

  const [users, setUsers] = useState<AdminUser[]>([])
  const [posts, setPosts] = useState<AdminPost[]>([])
  const [comments, setComments] = useState<AdminComment[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function load(tab: Tab) {
    setLoading(true)
    setError('')
    try {
      if (tab === 'users') setUsers(await getAdminUsers())
      else if (tab === 'posts') setPosts(await getAdminPosts())
      else setComments(await getAdminComments())
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load(tab)
  }, [tab])

  async function handleToggleRole(u: AdminUser) {
    const next = u.role === 'admin' ? 'member' : 'admin'
    if (!confirm(`确认将 @${u.username} 设为 ${next}？`)) return
    try {
      await updateUserRole(u.id, next)
      setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, role: next } : x)))
    } catch (err) {
      alert(err instanceof Error ? err.message : '操作失败')
    }
  }

  async function handleDeletePost(id: number, title: string) {
    if (!confirm(`确认删除帖子《${title}》？此操作不可撤销。`)) return
    try {
      await deletePost(id)
      setPosts((prev) => prev.filter((p) => p.id !== id))
    } catch (err) {
      alert(err instanceof Error ? err.message : '删除失败')
    }
  }

  async function handleDeleteComment(id: number) {
    if (!confirm('确认删除这条评论？')) return
    try {
      await deleteComment(id)
      setComments((prev) => prev.filter((c) => c.id !== id))
    } catch (err) {
      alert(err instanceof Error ? err.message : '删除失败')
    }
  }

  if (user?.role !== 'admin') {
    return (
      <div className="error-state">
        <h2 className="error-state__title">无权访问</h2>
        <p className="error-state__msg">该页面仅限管理员访问。</p>
      </div>
    )
  }

  return (
    <div className="form-page admin">
      <div className="admin__head">
        <div>
          <h1 className="form-page__title">管理后台</h1>
          <p className="form-page__subtitle">
            管理论坛用户、帖子和评论。如需升级首个管理员，请{' '}
            <Link to="/promote" className="inline-link">
              使用升级密钥
            </Link>
            。
          </p>
        </div>
      </div>

      <div className="mailbox__tabs">
        <button
          type="button"
          className={`mailbox__tab ${tab === 'users' ? 'mailbox__tab--active' : ''}`}
          onClick={() => setTab('users')}
        >
          用户（{users.length}）
        </button>
        <button
          type="button"
          className={`mailbox__tab ${tab === 'posts' ? 'mailbox__tab--active' : ''}`}
          onClick={() => setTab('posts')}
        >
          帖子（{posts.length}）
        </button>
        <button
          type="button"
          className={`mailbox__tab ${tab === 'comments' ? 'mailbox__tab--active' : ''}`}
          onClick={() => setTab('comments')}
        >
          评论（{comments.length}）
        </button>
      </div>

      {loading ? (
        <div className="loading">加载中</div>
      ) : error ? (
        <div className="form__error">{error}</div>
      ) : tab === 'users' ? (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>用户</th>
                <th>邮箱</th>
                <th>角色</th>
                <th>帖子</th>
                <th>评论</th>
                <th>注册时间</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="admin-table__user">@{u.username}</td>
                  <td className="admin-table__email">{u.email}</td>
                  <td>
                    <span
                      className={`role-badge ${
                        u.role === 'admin' ? 'role-badge--admin' : ''
                      }`}
                    >
                      {u.role === 'admin' ? '管理员' : '成员'}
                    </span>
                  </td>
                  <td>{u.posts_count}</td>
                  <td>{u.comments_count}</td>
                  <td>{formatTime(u.created_at)}</td>
                  <td>
                    {u.id !== user?.id && (
                      <button
                        type="button"
                        className="admin-table__action"
                        onClick={() => handleToggleRole(u)}
                      >
                        {u.role === 'admin' ? '降为成员' : '升为管理员'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : tab === 'posts' ? (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>标题</th>
                <th>作者</th>
                <th>分类</th>
                <th>浏览</th>
                <th>点赞</th>
                <th>评论</th>
                <th>发布时间</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {posts.map((p) => (
                <tr key={p.id}>
                  <td className="admin-table__title">
                    <Link to={`/post/${p.slug}`}>{p.title}</Link>
                  </td>
                  <td>@{p.author_username || '匿名'}</td>
                  <td>{p.category}</td>
                  <td>{p.views}</td>
                  <td>{p.likes_count}</td>
                  <td>{p.comments_count}</td>
                  <td>{formatTime(p.created_at)}</td>
                  <td>
                    <Link
                      to={`/edit/${p.id}`}
                      className="admin-table__action"
                    >
                      编辑
                    </Link>
                    <button
                      type="button"
                      className="admin-table__action admin-table__action--danger"
                      onClick={() => handleDeletePost(p.id, p.title)}
                    >
                      删除
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>内容</th>
                <th>作者</th>
                <th>所属帖子</th>
                <th>时间</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {comments.map((c) => (
                <tr key={c.id}>
                  <td className="admin-table__content">{c.content}</td>
                  <td>@{c.author_username}</td>
                  <td>
                    <Link to={`/post/${c.post_slug}`}>{c.post_title}</Link>
                  </td>
                  <td>{formatTime(c.created_at)}</td>
                  <td>
                    <button
                      type="button"
                      className="admin-table__action admin-table__action--danger"
                      onClick={() => handleDeleteComment(c.id)}
                    >
                      删除
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
