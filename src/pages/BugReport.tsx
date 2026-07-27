import { useState, FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { submitBug } from '../api'
import SEO from '../components/SEO'

const TYPE_OPTIONS = [
  { value: 'bug', label: 'Bug — 功能错误', icon: '🐛' },
  { value: 'ui', label: 'UI — 界面/样式问题', icon: '🎨' },
  { value: 'performance', label: '性能 — 加载慢/卡顿', icon: '⚡' },
  { value: 'feature', label: '功能建议', icon: '💡' },
  { value: 'security', label: '安全 — 安全漏洞', icon: '🔒' },
]

const SEVERITY_OPTIONS = [
  { value: 'low', label: '轻微 — 不影响使用', color: '#4caf50' },
  { value: 'normal', label: '一般 — 影响体验', color: '#ff9800' },
  { value: 'high', label: '严重 — 功能不可用', color: '#f44336' },
  { value: 'critical', label: '致命 — 数据丢失/崩溃', color: '#9c27b0' },
]

export default function BugReport() {
  const { user } = useAuth()
  const [type, setType] = useState('bug')
  const [severity, setSeverity] = useState('normal')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [url, setUrl] = useState('')
  const [browser, setBrowser] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  if (!user) {
    return (
      <div className="error-state">
        <h2 className="error-state__title">请先登录</h2>
        <p className="error-state__msg">
          <Link to="/login" style={{ color: 'var(--accent)' }}>去登录</Link>
        </p>
      </div>
    )
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess(false)
    setSubmitting(true)
    try {
      await submitBug({
        type,
        severity,
        title: title.trim(),
        description: description.trim(),
        url: url.trim(),
        browser: browser.trim() || navigator.userAgent,
      })
      setSuccess(true)
      setTitle('')
      setDescription('')
      setUrl('')
      setBrowser('')
    } catch (err) {
      setError(err instanceof Error ? err.message : '提交失败')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="form-page">
      <SEO title="提交 Bug - Marginalia" description="发现问题？提交 Bug 报告，帮助我们改进。" />
      <Link to="/" className="back-link">← 返回首页</Link>
      <h1 className="form-page__title">提交 Bug / 建议</h1>
      <p className="settings__page-subtitle">
        发现了问题或有改进想法？告诉我们，我们会认真处理每一条反馈。
      </p>

      {error && <div className="form__error">{error}</div>}
      {success && (
        <div className="form__success">
          提交成功！感谢你的反馈，我们会在后台查看。
          <button
            type="button"
            className="form__hint-btn"
            onClick={() => setSuccess(false)}
            style={{ marginLeft: 'var(--space-sm)' }}
          >
            再提交一条
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="form">
        <div className="form__field">
          <label className="form__label">类型</label>
          <div className="bug-types">
            {TYPE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={`bug-type-btn ${type === opt.value ? 'bug-type-btn--active' : ''}`}
                onClick={() => setType(opt.value)}
              >
                <span className="bug-type-btn__icon">{opt.icon}</span>
                <span>{opt.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="form__field">
          <label className="form__label">严重程度</label>
          <div className="bug-severity">
            {SEVERITY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={`bug-severity-btn ${severity === opt.value ? 'bug-severity-btn--active' : ''}`}
                style={severity === opt.value ? { borderColor: opt.color, color: opt.color } : {}}
                onClick={() => setSeverity(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="form__field">
          <label className="form__label">标题</label>
          <input
            className="form__input"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="简要描述问题"
            maxLength={200}
            required
          />
        </div>

        <div className="form__field">
          <label className="form__label">详细描述</label>
          <textarea
            className="form__textarea"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={'描述问题的重现步骤：\n1. 打开了什么页面\n2. 点击了什么按钮\n3. 出现了什么情况\n\n期望的结果是什么？实际的结果是什么？'}
            rows={8}
            maxLength={5000}
            required
          />
          <p className="form__hint">{description.length} / 5000 字符</p>
        </div>

        <div className="form__row">
          <div className="form__field">
            <label className="form__label">出问题的页面 URL（可选）</label>
            <input
              className="form__input"
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://..."
              maxLength={500}
            />
          </div>
          <div className="form__field">
            <label className="form__label">浏览器/设备（可选）</label>
            <input
              className="form__input"
              type="text"
              value={browser}
              onChange={(e) => setBrowser(e.target.value)}
              placeholder="自动检测，可手动修改"
              maxLength={200}
            />
          </div>
        </div>

        <div className="form__actions">
          <button type="submit" className="btn-primary" disabled={submitting || !title.trim() || !description.trim()}>
            {submitting ? '提交中…' : '提交反馈'}
          </button>
        </div>
      </form>
    </div>
  )
}
