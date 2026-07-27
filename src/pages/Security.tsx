import { useEffect, useState, FormEvent } from 'react'
import { Link } from 'react-router-dom'
import {
  getTwoFactorStatus,
  setupTwoFactor,
  enableTwoFactor,
  disableTwoFactor,
  type TwoFactorSetup,
} from '../api'
import { useAuth } from '../auth/AuthContext'

export default function Security() {
  const { user } = useAuth()
  const [enabled, setEnabled] = useState(false)
  const [loading, setLoading] = useState(true)

  // 启用流程
  const [setup, setSetup] = useState<TwoFactorSetup | null>(null)
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // 关闭流程
  const [disableCode, setDisableCode] = useState('')

  useEffect(() => {
    if (!user) {
      setLoading(false)
      return
    }
    getTwoFactorStatus()
      .then((s) => {
        setEnabled(s.enabled)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [user])

  async function handleSetup() {
    setBusy(true)
    setError('')
    try {
      const s = await setupTwoFactor()
      setSetup(s)
    } catch (err) {
      setError(err instanceof Error ? err.message : '生成密钥失败')
    } finally {
      setBusy(false)
    }
  }

  async function handleEnable(e: FormEvent) {
    e.preventDefault()
    if (!setup) return
    setBusy(true)
    setError('')
    try {
      const r = await enableTwoFactor(code.trim())
      if (r.enabled) {
        setEnabled(true)
        setSetup(null)
        setCode('')
        setSuccess('两步验证已开启')
      } else {
        setError(r.message || '启用失败')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '验证码错误')
    } finally {
      setBusy(false)
    }
  }

  async function handleDisable(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const r = await disableTwoFactor(disableCode.trim())
      if (!r.enabled) {
        setEnabled(false)
        setDisableCode('')
        setSuccess('两步验证已关闭')
      } else {
        setError(r.message || '关闭失败')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '验证码错误')
    } finally {
      setBusy(false)
    }
  }

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

  // QR 码：用公共二维码 API 渲染 otpauth_url
  const qrUrl = setup
    ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(setup.otpauth_url)}`
    : null

  return (
    <div className="form-page security">
      <Link to={`/${user.username}`} className="back-link">← 返回我的空间</Link>
      <h1 className="form-page__title">账户安全</h1>
      <p className="form-page__subtitle">
        管理两步验证（2FA）。开启后，登录时除了密码还需要输入验证器 App 生成的 6 位验证码。
      </p>

      {error && <div className="form__error">{error}</div>}
      {success && <div className="form__success">{success}</div>}

      {loading ? (
        <div className="loading">加载中…</div>
      ) : enabled ? (
        <div className="security__section">
          <div className="security__status security__status--on">
            <span className="security__status-dot" />
            <div>
              <strong>两步验证已开启</strong>
              <p>登录时需要输入验证码。如需关闭，请输入当前验证码确认。</p>
            </div>
          </div>
          <form onSubmit={handleDisable} className="form">
            <div className="form__field">
              <label className="form__label">输入验证码以关闭 2FA</label>
              <input
                className="form__input form__input--code"
                type="text"
                inputMode="numeric"
                pattern="\d{6}"
                maxLength={6}
                value={disableCode}
                onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, ''))}
                placeholder="123456"
                required
                autoComplete="one-time-code"
              />
            </div>
            <div className="form__actions">
              <button
                type="submit"
                className="btn-primary"
                disabled={busy || disableCode.length !== 6}
              >
                {busy ? '处理中…' : '关闭 2FA'}
              </button>
            </div>
          </form>
        </div>
      ) : setup ? (
        <div className="security__section">
          <div className="security__setup">
            <div className="security__qr">
              {qrUrl && <img src={qrUrl} alt="扫描二维码添加到验证器" width={200} height={200} />}
            </div>
            <div className="security__setup-info">
              <h3>1. 扫描二维码</h3>
              <p>用 Google Authenticator、1Password、Authy 等扫描左侧二维码。</p>
              <h3>2. 或手动输入密钥</h3>
              <code className="security__secret">{setup.secret}</code>
              <h3>3. 输入验证器显示的 6 位验证码</h3>
              <form onSubmit={handleEnable} className="form">
                <div className="form__field">
                  <input
                    className="form__input form__input--code"
                    type="text"
                    inputMode="numeric"
                    pattern="\d{6}"
                    maxLength={6}
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="123456"
                    required
                    autoFocus
                    autoComplete="one-time-code"
                  />
                </div>
                <div className="form__actions">
                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={busy || code.length !== 6}
                  >
                    {busy ? '验证中…' : '开启 2FA'}
                  </button>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => {
                      setSetup(null)
                      setCode('')
                      setError('')
                    }}
                  >
                    取消
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      ) : (
        <div className="security__section">
          <div className="security__status security__status--off">
            <span className="security__status-dot" />
            <div>
              <strong>两步验证未开启</strong>
              <p>建议管理员账户开启 2FA，防止密码泄露后被爆破登录。</p>
            </div>
          </div>
          <div className="form__actions">
            <button
              type="button"
              className="btn-primary"
              onClick={handleSetup}
              disabled={busy}
            >
              {busy ? '生成中…' : '开启 2FA'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
