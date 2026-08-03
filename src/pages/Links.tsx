import { useEffect, useState, FormEvent } from 'react'
import { getFriendLinks, createFriendLink, deleteFriendLink, type FriendLink } from '../api'
import { useAuth } from '../auth/AuthContext'
import SEO from '../components/SEO'

export default function Links() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'
  const [links, setLinks] = useState<FriendLink[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [desc, setDesc] = useState('')
  const [busy, setBusy] = useState(false)

  function load() {
    getFriendLinks()
      .then(setLinks)
      .catch((e) => setError(e.message || '加载失败'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  async function handleAdd(e: FormEvent) {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    try {
      await createFriendLink({ name, url, description: desc })
      setName(''); setUrl(''); setDesc('')
      setShowForm(false)
      load()
    } catch (err) {
      alert(err instanceof Error ? err.message : '添加失败')
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('确认删除此链接？')) return
    try {
      await deleteFriendLink(id)
      load()
    } catch (err) {
      alert(err instanceof Error ? err.message : '删除失败')
    }
  }

  return (
    <div className="container">
      <SEO title="友情链接" description="Marginalia 的友情链接" />
      <div className="section-header">
        <h1 className="section-header__title">友情链接</h1>
        {isAdmin && (
          <button type="button" className="btn-secondary" onClick={() => setShowForm((s) => !s)}>
            {showForm ? '取消' : '+ 添加链接'}
          </button>
        )}
      </div>

      {isAdmin && showForm && (
        <form className="links-form" onSubmit={handleAdd}>
          <input
            className="form__input"
            placeholder="站点名称"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <input
            className="form__input"
            placeholder="https://"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            required
          />
          <input
            className="form__input"
            placeholder="简短描述（可选）"
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
          />
          <button type="submit" className="btn-primary" disabled={busy}>{busy ? '添加中…' : '添加'}</button>
        </form>
      )}

      {loading ? (
        <div className="loading">加载中</div>
      ) : error ? (
        <div className="error-state"><p>{error}</p></div>
      ) : links.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state__icon">🔗</div>
          <p>暂无友情链接</p>
        </div>
      ) : (
        <div className="links-grid">
          {links.map((l) => (
            <div key={l.id} className="link-card">
              <a href={l.url} target="_blank" rel="noopener noreferrer" className="link-card__name">
                {l.name}
              </a>
              {l.description && <p className="link-card__desc">{l.description}</p>}
              <span className="link-card__url">{l.url.replace(/^https?:\/\//, '')}</span>
              {isAdmin && (
                <button type="button" className="link-card__delete" onClick={() => handleDelete(l.id)}>
                  删除
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
