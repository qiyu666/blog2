import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  getSeriesList,
  createSeries,
  updateSeries,
  deleteSeries,
  getSeries,
  addPostToSeries,
  removePostFromSeries,
  type Series,
  type SeriesPost,
} from '../api'
import SEO from '../components/SEO'

export default function SeriesManage() {
  const [seriesList, setSeriesList] = useState<Series[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState<Series | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [managingSlug, setManagingSlug] = useState<string | null>(null)
  const [managePosts, setManagePosts] = useState<SeriesPost[]>([])
  const [manageLoading, setManageLoading] = useState(false)

  // 表单状态
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [coverImage, setCoverImage] = useState('')
  const [saving, setSaving] = useState(false)

  // 添加文章状态
  const [postIdInput, setPostIdInput] = useState('')
  const [addError, setAddError] = useState('')

  useEffect(() => {
    loadSeries()
  }, [])

  async function loadSeries() {
    setLoading(true)
    try {
      const list = await getSeriesList()
      setSeriesList(list)
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载失败')
    } finally {
      setLoading(false)
    }
  }

  function openCreate() {
    setEditing(null)
    setTitle('')
    setDescription('')
    setCoverImage('')
    setShowForm(true)
  }

  function openEdit(s: Series) {
    setEditing(s)
    setTitle(s.title)
    setDescription(s.description || '')
    setCoverImage(s.cover_image || '')
    setShowForm(true)
  }

  async function handleSave() {
    if (!title.trim()) {
      setError('标题不能为空')
      return
    }
    setSaving(true)
    setError('')
    try {
      if (editing) {
        await updateSeries(editing.slug, {
          title: title.trim(),
          description,
          cover_image: coverImage,
        })
      } else {
        await createSeries({
          title: title.trim(),
          description,
          cover_image: coverImage,
        })
      }
      setShowForm(false)
      await loadSeries()
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存失败')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(s: Series) {
    if (!confirm(`确定删除合集「${s.title}」吗？此操作不可撤销。`)) return
    try {
      await deleteSeries(s.slug)
      await loadSeries()
    } catch (e) {
      setError(e instanceof Error ? e.message : '删除失败')
    }
  }

  async function openManage(slug: string) {
    setManagingSlug(slug)
    setManageLoading(true)
    setAddError('')
    try {
      const data = await getSeries(slug)
      setManagePosts(data.posts)
    } catch (e) {
      setAddError(e instanceof Error ? e.message : '加载失败')
    } finally {
      setManageLoading(false)
    }
  }

  async function handleAddPost() {
    if (!managingSlug || !postIdInput.trim()) return
    const postId = Number(postIdInput.trim())
    if (!postId) {
      setAddError('请输入有效的文章 ID')
      return
    }
    setAddError('')
    try {
      await addPostToSeries(managingSlug, postId, managePosts.length)
      const data = await getSeries(managingSlug)
      setManagePosts(data.posts)
      setPostIdInput('')
    } catch (e) {
      setAddError(e instanceof Error ? e.message : '添加失败')
    }
  }

  async function handleRemovePost(postId: number) {
    if (!managingSlug) return
    try {
      await removePostFromSeries(managingSlug, postId)
      setManagePosts((prev) => prev.filter((p) => p.id !== postId))
    } catch (e) {
      setAddError(e instanceof Error ? e.message : '移除失败')
    }
  }

  async function handleMovePost(postId: number, direction: 'up' | 'down') {
    if (!managingSlug) return
    const index = managePosts.findIndex((p) => p.id === postId)
    if (index < 0) return
    const swapIndex = direction === 'up' ? index - 1 : index + 1
    if (swapIndex < 0 || swapIndex >= managePosts.length) return

    const newPosts = [...managePosts]
    ;[newPosts[index], newPosts[swapIndex]] = [newPosts[swapIndex], newPosts[index]]
    setManagePosts(newPosts)

    try {
      // 批量更新排序
      const items = newPosts.map((p, i) => ({ post_id: p.id, sort_order: i }))
      await fetch(`/api/series/${managingSlug}/posts`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      })
    } catch {
      // 排序失败时重新加载
      const data = await getSeries(managingSlug)
      setManagePosts(data.posts)
    }
  }

  if (loading) return <div className="loading">加载中</div>

  return (
    <div className="container">
      <SEO title="管理合集" description="创建和管理文章合集" />
      <div className="section-header">
        <h1 className="section-header__title">管理合集</h1>
        <button className="btn-primary" onClick={openCreate}>+ 新建合集</button>
      </div>

      {error && <div className="form__error">{error}</div>}

      {seriesList.length === 0 && !showForm && (
        <div className="empty-state">
          <div className="empty-state__icon">📚</div>
          <p>还没有合集，点击「新建合集」创建第一个</p>
        </div>
      )}

      {seriesList.length > 0 && (
        <div className="series-manage__list">
          {seriesList.map((s) => (
            <div key={s.id} className="series-manage__item">
              <div className="series-manage__item-info">
                <h3 className="series-manage__item-title">
                  <Link to={`/series/${s.slug}`}>{s.title}</Link>
                </h3>
                {s.description && <p className="series-manage__item-desc">{s.description}</p>}
                <div className="series-manage__item-meta">
                  <span>📚 {s.posts_count ?? 0} 篇</span>
                  {s.author_username && <span>· @{s.author_username}</span>}
                </div>
              </div>
              <div className="series-manage__item-actions">
                <button className="btn-secondary" onClick={() => openManage(s.slug)}>管理文章</button>
                <button className="btn-secondary" onClick={() => openEdit(s)}>编辑</button>
                <button className="btn-secondary btn-secondary--danger" onClick={() => handleDelete(s)}>删除</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 创建/编辑表单 */}
      {showForm && (
        <div className="series-manage__form">
          <h2>{editing ? '编辑合集' : '新建合集'}</h2>
          <div className="form-group">
            <label>标题</label>
            <input
              className="form-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="合集标题"
              maxLength={200}
            />
          </div>
          <div className="form-group">
            <label>简介</label>
            <textarea
              className="form-textarea"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="合集简介（可选）"
              rows={3}
              maxLength={2000}
            />
          </div>
          <div className="form-group">
            <label>封面图 URL</label>
            <input
              className="form-input"
              value={coverImage}
              onChange={(e) => setCoverImage(e.target.value)}
              placeholder="https://..."
            />
          </div>
          <div className="series-manage__form-actions">
            <button className="btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? '保存中…' : '保存'}
            </button>
            <button className="btn-secondary" onClick={() => setShowForm(false)}>取消</button>
          </div>
        </div>
      )}

      {/* 文章管理面板 */}
      {managingSlug && (
        <div className="series-manage__posts">
          <div className="series-manage__posts-header">
            <h2>管理合集文章</h2>
            <button className="btn-secondary" onClick={() => setManagingSlug(null)}>关闭</button>
          </div>

          {manageLoading ? (
            <div className="loading">加载中</div>
          ) : (
            <>
              <div className="series-manage__add-post">
                <input
                  className="form-input"
                  type="number"
                  value={postIdInput}
                  onChange={(e) => setPostIdInput(e.target.value)}
                  placeholder="输入文章 ID"
                />
                <button className="btn-primary" onClick={handleAddPost}>添加</button>
              </div>
              {addError && <div className="form__error">{addError}</div>}

              {managePosts.length === 0 ? (
                <p className="series-manage__empty">该合集暂无文章</p>
              ) : (
                <ol className="series-manage__post-list">
                  {managePosts.map((p, idx) => (
                    <li key={p.id} className="series-manage__post-item">
                      <span className="series-manage__post-index">{idx + 1}</span>
                      <div className="series-manage__post-info">
                        <Link to={`/post/${p.slug}`} className="series-manage__post-title">{p.title}</Link>
                        <span className="series-manage__post-meta">
                          {p.category} · {p.views ?? 0} 浏览
                        </span>
                      </div>
                      <div className="series-manage__post-actions">
                        <button
                          className="btn-icon"
                          onClick={() => handleMovePost(p.id, 'up')}
                          disabled={idx === 0}
                          title="上移"
                        >↑</button>
                        <button
                          className="btn-icon"
                          onClick={() => handleMovePost(p.id, 'down')}
                          disabled={idx === managePosts.length - 1}
                          title="下移"
                        >↓</button>
                        <button
                          className="btn-icon btn-icon--danger"
                          onClick={() => handleRemovePost(p.id)}
                          title="移除"
                        >✕</button>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
