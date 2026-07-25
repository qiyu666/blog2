import { useState, FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { sendMessage } from '../api'

export default function NewMessage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const initialTo = params.get('to') || ''

  const [to, setTo] = useState(initialTo)
  const [subject, setSubject] = useState('')
  const [content, setContent] = useState('')
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (!to.trim() || !content.trim()) {
      setError('收件人和内容不能为空')
      return
    }
    setSending(true)
    try {
      await sendMessage(to.trim(), subject.trim(), content.trim())
      navigate('/mailbox')
    } catch (err) {
      setError(err instanceof Error ? err.message : '发送失败')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="form-page">
      <Link to="/mailbox" className="back-link">
        ← 返回站内信
      </Link>
      <h1 className="form-page__title">写信</h1>

      {error && <div className="form__error">{error}</div>}

      <form onSubmit={handleSubmit} className="form">
        <div className="form__field">
          <label className="form__label">收件人（用户名或邮箱）</label>
          <input
            className="form__input"
            type="text"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="例如：alice 或 alice@example.com"
            required
            autoFocus
          />
        </div>
        <div className="form__field">
          <label className="form__label">主题</label>
          <input
            className="form__input"
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="（可选）"
          />
        </div>
        <div className="form__field">
          <label className="form__label">正文</label>
          <textarea
            className="form__textarea"
            rows={8}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="写下你想说的话…"
            required
          />
        </div>
        <div className="form__actions">
          <button type="submit" className="btn-primary" disabled={sending}>
            {sending ? '发送中…' : '发送'}
          </button>
          <Link to="/mailbox" className="btn-secondary">
            取消
          </Link>
        </div>
      </form>

      <p className="form__hint">
        站内信仅可在本站成员之间发送。如需使用站外邮箱，请访问{' '}
        <a
          href="https://mail.qiyu666.dpdns.org"
          target="_blank"
          rel="noreferrer"
          className="inline-link"
        >
          mail.qiyu666.dpdns.org
        </a>
        。
      </p>
    </div>
  )
}
