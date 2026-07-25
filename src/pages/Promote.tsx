import { useState, FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { promoteUser } from '../api'

export default function Promote() {
  const [username, setUsername] = useState('')
  const [secret, setSecret] = useState('')
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setMsg('')
    if (!username.trim() || !secret.trim()) {
      setError('用户名和密钥都必须填写')
      return
    }
    setLoading(true)
    try {
      const res = await promoteUser(username.trim(), secret.trim())
      setMsg(res.message || '升级成功')
      setSecret('')
    } catch (err) {
      setError(err instanceof Error ? err.message : '升级失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="form-page">
      <Link to="/" className="back-link">
        ← 返回首页
      </Link>
      <h1 className="form-page__title">升级管理员</h1>
      <p className="form-page__subtitle">
        此页面用于将一个已注册用户升级为管理员。需要预先在 Cloudflare Pages
        项目设置中配置 <code>ADMIN_SECRET</code> 环境变量。
      </p>

      {error && <div className="form__error">{error}</div>}
      {msg && (
        <div className="form__success">
          {msg}
          <Link to="/admin" className="inline-link" style={{ marginLeft: 8 }}>
            进入后台 →
          </Link>
        </div>
      )}

      <form onSubmit={handleSubmit} className="form">
        <div className="form__field">
          <label className="form__label">用户名</label>
          <input
            className="form__input"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="要升级为管理员的用户名"
            required
            autoFocus
          />
        </div>
        <div className="form__field">
          <label className="form__label">管理员密钥（ADMIN_SECRET）</label>
          <input
            className="form__input"
            type="password"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            placeholder="部署时在环境变量中设置的值"
            required
          />
        </div>
        <div className="form__actions">
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? '升级中…' : '升级为管理员'}
          </button>
        </div>
      </form>

      <p className="form__hint">
        升级成功后，请重新登录该账号以刷新会话中的角色信息。之后即可在{' '}
        <Link to="/admin" className="inline-link">
          /admin
        </Link>{' '}
        管理其他用户和内容。
      </p>
    </div>
  )
}
