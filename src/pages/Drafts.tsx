import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type { Post } from '../types'
import { getPosts, updatePost, deletePost } from '../api'
import SEO from '../components/SEO'

function formatTime(dateStr: string): string {
  return new Date(dateStr + 'Z').toLocaleString('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function Drafts() {
  const navigate = useNavigate()
  const [drafts, setDrafts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState<number | null>(null)

  async function load() {
    setLoading(true)
    setError('')
    try {
      const list = await getPosts(undefined, 'draft')
      setDrafts(list)
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function handlePublish(p: Post) {
    if (!confirm(`确认发布草稿《${p.title}》？`)) return
    setBusyId(p.id)
    try {
      await updatePost(p.id, {
        title: p.title,
        excerpt: p.excerpt,
        content: p.content,
        category: p.category,
        tags: p.tags,
        cover_image: p.cover_image,
        published: 1,
      })
      setDrafts((prev) => prev.filter((d) => d.id !== p.id))
      navigate(`/post/${p.slug}`)
    } catch (err) {
      alert(err instanceof Error ? err.message : '发布失败')
    } finally {
      setBusyId(null)
    }
  }

  async function handleDelete(p: Post) {
    if (!confirm(`确认删除草稿《${p.title}》？此操作不可撤销。`)) return
    setBusyId(p.id)
    try {
      await deletePost(p.id)
      setDrafts((prev) => prev.filter((d) => d.id !== p.id))
    } catch (err) {
      alert(err instanceof Error ? err.message : '删除失败')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="drafts-page">
      <SEO title="我的草稿" description="我的草稿 - Marginalia" />
      <div className="drafts-page__head">
        <div>
          <h1 className="drafts-page__title">我的草稿</h1>
          <p className="drafts-page__subtitle">
            未发布的草稿。写完一篇？{' '}
            <Link to="/new" className="inline-link">
              新建帖子
            </Link>
          </p>
        </div>
      </div>

      {loading ? (
        <div className="loading">加载中</div>
      ) : error ? (
        <div className="form__error">{error}</div>
      ) : drafts.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state__icon">📝</div>
          <p className="empty-state__msg">还没有草稿。</p>
          <Link to="/new" className="btn-primary">
            写一篇
          </Link>
        </div>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>标题</th>
                <th>分类</th>
                <th>最后更新</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {drafts.map((p) => {
                const disabled = busyId === p.id
                return (
                  <tr key={p.id}>
                    <td className="admin-table__title">{p.title}</td>
                    <td>
                      <span className="admin-tag">{p.category}</span>
                    </td>
                    <td className="admin-table__time">
                      {formatTime(p.updated_at || p.created_at)}
                    </td>
                    <td>
                      <div className="admin-action-group">
                        <Link
                          to={`/edit/${p.id}`}
                          className="admin-action"
                        >
                          编辑
                        </Link>
                        <button
                          type="button"
                          className="admin-action admin-action--primary"
                          onClick={() => handlePublish(p)}
                          disabled={disabled}
                        >
                          {disabled ? '处理中…' : '发布'}
                        </button>
                        <button
                          type="button"
                          className="admin-action admin-action--danger"
                          onClick={() => handleDelete(p)}
                          disabled={disabled}
                        >
                          删除
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
