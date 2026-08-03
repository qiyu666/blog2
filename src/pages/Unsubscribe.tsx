import { useState, FormEvent } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { unsubscribe } from '../api'
import SEO from '../components/SEO'

export default function Unsubscribe() {
  const [params] = useSearchParams()
  const token = params.get('token') || ''
  const [done, setDone] = useState(false)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleUnsubscribe(e: FormEvent) {
    e.preventDefault()
    if (!token || busy) return
    setBusy(true)
    setErr('')
    try {
      await unsubscribe(token)
      setDone(true)
    } catch (e) {
      setErr(e instanceof Error ? e.message : '退订失败')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="container auth-page">
      <SEO title="退订" description="取消邮件订阅" />
      <div className="auth-card">
        {done ? (
          <>
            <h1 className="auth-card__title">已退订</h1>
            <p className="auth-card__subtitle">你将不再收到来自 Marginalia 的邮件通知。</p>
            <Link to="/" className="btn-primary">返回首页</Link>
          </>
        ) : (
          <>
            <h1 className="auth-card__title">取消订阅</h1>
            <p className="auth-card__subtitle">确认要取消接收 Marginalia 的新文章邮件通知吗？</p>
            {err && <div className="form-error">{err}</div>}
            <form onSubmit={handleUnsubscribe}>
              <button type="submit" className="btn-delete" disabled={busy || !token}>
                {busy ? '处理中…' : '确认退订'}
              </button>
            </form>
            <Link to="/" className="auth-card__link">返回首页</Link>
          </>
        )}
      </div>
    </div>
  )
}
