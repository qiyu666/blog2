import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import type { Post } from '../types'
import {
  getFavorites,
  getFavoriteCollections,
  createFavoriteCollection,
  renameFavoriteCollection,
  deleteFavoriteCollection,
  moveFavorite,
  type FavoriteCollection,
} from '../api'
import PostCard from '../components/PostCard'

interface FavoritePost extends Post {
  favorite_id?: number
  collection_id?: number | null
  favorited_at?: string
}

interface CollectionsPayload {
  default: FavoriteCollection
  collections: FavoriteCollection[]
}

export default function Favorites() {
  const [posts, setPosts] = useState<FavoritePost[]>([])
  const [collections, setCollections] = useState<FavoriteCollection[]>([])
  const [defaultCount, setDefaultCount] = useState(0)
  const [activeId, setActiveId] = useState<number | null>(null) // null = 默认收藏
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // 收藏夹管理状态
  const [managing, setManaging] = useState(false)
  const [newName, setNewName] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editingName, setEditingName] = useState('')
  const [busyId, setBusyId] = useState<number | null>(null)

  const loadCollections = useCallback(async () => {
    try {
      const data = await getFavoriteCollections()
      const payload = data as unknown as CollectionsPayload
      // 兼容两种返回：直接数组 或 { default, collections }
      if (Array.isArray(data)) {
        setCollections(data)
        setDefaultCount(0)
      } else if (payload && Array.isArray(payload.collections)) {
        setCollections(payload.collections)
        setDefaultCount(payload.default?.count ?? 0)
      }
    } catch {
      // 忽略，收藏夹功能不可用时不阻塞列表
    }
  }, [])

  const loadPosts = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getFavorites()
      setPosts(data as FavoritePost[])
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadCollections()
    loadPosts()
  }, [loadCollections, loadPosts])

  const filtered = activeId === null
    ? posts.filter((p) => p.collection_id == null)
    : posts.filter((p) => p.collection_id === activeId)

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    const name = newName.trim()
    if (!name) return
    try {
      const created = await createFavoriteCollection(name)
      setCollections((prev) => [...prev, created])
      setNewName('')
    } catch (err) {
      alert(err instanceof Error ? err.message : '创建失败')
    }
  }

  async function handleRename(id: number) {
    const name = editingName.trim()
    if (!name) return
    setBusyId(id)
    try {
      await renameFavoriteCollection(id, name)
      setCollections((prev) => prev.map((c) => (c.id === id ? { ...c, name } : c)))
      setEditingId(null)
    } catch (err) {
      alert(err instanceof Error ? err.message : '重命名失败')
    } finally {
      setBusyId(null)
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('删除这个收藏夹？夹内的收藏会移回"默认收藏"。')) return
    setBusyId(id)
    try {
      await deleteFavoriteCollection(id)
      setCollections((prev) => prev.filter((c) => c.id !== id))
      // 本地把该夹内的收藏移回默认
      setPosts((prev) => prev.map((p) => (p.collection_id === id ? { ...p, collection_id: null } : p)))
      if (activeId === id) setActiveId(null)
    } catch (err) {
      alert(err instanceof Error ? err.message : '删除失败')
    } finally {
      setBusyId(null)
    }
  }

  async function handleMove(favoriteId: number, targetId: number | null) {
    if (!favoriteId) return
    try {
      await moveFavorite(favoriteId, targetId)
      setPosts((prev) =>
        prev.map((p) => (p.favorite_id === favoriteId ? { ...p, collection_id: targetId } : p))
      )
      // 重新拉取计数以保证准确
      loadCollections()
    } catch (err) {
      alert(err instanceof Error ? err.message : '移动失败')
    }
  }

  return (
    <section className="posts-section">
      <div className="container">
        <div className="section-header">
          <h2 className="section-header__title">我的收藏</h2>
          <span className="section-header__count">{posts.length} 篇</span>
        </div>

        {/* 收藏夹标签 */}
        <div className="fav-collections">
          <button
            type="button"
            className={`fav-collections__tab${activeId === null ? ' fav-collections__tab--active' : ''}`}
            onClick={() => setActiveId(null)}
          >
            默认收藏
            <span className="fav-collections__count">{defaultCount}</span>
          </button>
          {collections.map((c) => (
            <button
              key={c.id}
              type="button"
              className={`fav-collections__tab${activeId === c.id ? ' fav-collections__tab--active' : ''}`}
              onClick={() => setActiveId(c.id)}
            >
              {c.name}
              <span className="fav-collections__count">{c.count}</span>
            </button>
          ))}
          <span className="fav-collections__manage">
            <button
              type="button"
              className="fav-collections__icon-btn"
              onClick={() => setManaging((m) => !m)}
              title={managing ? '收起管理' : '管理收藏夹'}
              aria-label="管理收藏夹"
            >
              {managing ? '✕' : '＋'}
            </button>
          </span>
        </div>

        {/* 新建收藏夹 */}
        {managing && (
          <div style={{ marginBottom: '1rem' }}>
            <form onSubmit={handleCreate} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
              <input
                className="form__input"
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="新收藏夹名称"
                maxLength={50}
                style={{ maxWidth: 260 }}
              />
              <button type="submit" className="btn-primary" disabled={!newName.trim()}>
                新建
              </button>
            </form>

            {collections.length > 0 && (
              <div>
                {collections.map((c) => (
                  <div key={c.id} className="fav-collection-row">
                    {editingId === c.id ? (
                      <>
                        <input
                          className="fav-collection-row__input"
                          type="text"
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          maxLength={50}
                          autoFocus
                        />
                        <button
                          type="button"
                          className="fav-collection-row__btn"
                          onClick={() => handleRename(c.id)}
                          disabled={busyId === c.id}
                        >
                          保存
                        </button>
                        <button
                          type="button"
                          className="fav-collection-row__btn"
                          onClick={() => setEditingId(null)}
                          disabled={busyId === c.id}
                        >
                          取消
                        </button>
                      </>
                    ) : (
                      <>
                        <span className="fav-collection-row__name">{c.name}（{c.count}）</span>
                        <button
                          type="button"
                          className="fav-collection-row__btn"
                          onClick={() => { setEditingId(c.id); setEditingName(c.name) }}
                          disabled={busyId === c.id}
                        >
                          重命名
                        </button>
                        <button
                          type="button"
                          className="fav-collection-row__btn fav-collection-row__btn--danger"
                          onClick={() => handleDelete(c.id)}
                          disabled={busyId === c.id}
                        >
                          删除
                        </button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {loading ? (
          <div className="loading">加载中</div>
        ) : error ? (
          <div className="form__error">{error}</div>
        ) : filtered.length === 0 ? (
          <div className="error-state">
            <h2 className="error-state__title">
              {activeId === null ? '还没有收藏' : '此收藏夹为空'}
            </h2>
            <p className="error-state__msg">
              <Link to="/" style={{ color: 'var(--accent)' }}>
                去论坛看看 →
              </Link>
            </p>
          </div>
        ) : (
          <div className="posts-grid">
            {filtered.map((post) => (
              <div key={post.id} style={{ position: 'relative' }}>
                <PostCard post={post} />
                {post.favorite_id && (
                  <div style={{ padding: '0 0.75rem 0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-soft, #6b7280)' }}>移至</span>
                    <select
                      className="fav-move-select"
                      value={post.collection_id ?? 0}
                      onChange={(e) => {
                        const v = Number(e.target.value)
                        handleMove(post.favorite_id!, v === 0 ? null : v)
                      }}
                    >
                      <option value={0}>默认收藏</option>
                      {collections.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
