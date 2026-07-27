import { useEffect, useState, FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { updateProfile, changePassword, type ProfileUpdate } from '../api'

export default function Settings() {
  const { user, refreshUser } = useAuth()
  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')
  const [avatar, setAvatar] = useState('')
  const [location, setLocation] = useState('')
  const [website, setWebsite] = useState('')
  const [profileBg, setProfileBg] = useState('')
  const [profileCss, setProfileCss] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [previewCss, setPreviewCss] = useState(false)

  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [pwdSaving, setPwdSaving] = useState(false)
  const [pwdError, setPwdError] = useState('')
  const [pwdSuccess, setPwdSuccess] = useState('')

  useEffect(() => {
    if (user) {
      setDisplayName(user.display_name || '')
      setBio(user.bio || '')
      setAvatar(user.avatar || '')
      setLocation(user.location || '')
      setWebsite(user.website || '')
      setProfileBg(user.profile_bg || '')
      setProfileCss(user.profile_css || '')
    }
  }, [user])

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
    if (!user) return
    setError('')
    setSuccess('')
    setSaving(true)

    const data: ProfileUpdate = {
      display_name: displayName,
      bio,
      avatar,
      location,
      website,
      profile_bg: profileBg,
      profile_css: profileCss,
    }

    try {
      await updateProfile(user.username, data)
      setSuccess('资料已保存')
      if (typeof refreshUser === 'function') {
        await refreshUser()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败')
    } finally {
      setSaving(false)
    }
  }

  async function handlePasswordSubmit(e: FormEvent) {
    e.preventDefault()
    setPwdError('')
    setPwdSuccess('')

    if (!newPassword || newPassword.length < 8) {
      setPwdError('新密码至少需要 8 个字符')
      return
    }
    if (newPassword !== confirmPassword) {
      setPwdError('两次输入的密码不一致')
      return
    }

    const hasPassword = user?.password_hash && user.password_hash.length > 0
    if (hasPassword && !oldPassword) {
      setPwdError('请输入当前密码')
      return
    }

    setPwdSaving(true)
    try {
      await changePassword(newPassword, hasPassword ? oldPassword : undefined)
      setPwdSuccess('密码已更新')
      setOldPassword('')
      setNewPassword('')
      setConfirmPassword('')
      if (typeof refreshUser === 'function') {
        await refreshUser()
      }
    } catch (err) {
      setPwdError(err instanceof Error ? err.message : '更新失败')
    } finally {
      setPwdSaving(false)
    }
  }

  return (
    <div className="settings">
      <Link to={`/${user.username}`} className="back-link">
        ← 返回我的空间
      </Link>
      <h1 className="settings__page-title">编辑资料</h1>
      <p className="settings__page-subtitle">
        自定义你的个人空间。自定义 CSS 会被安全过滤，URL、JavaScript、import 等危险内容会被移除。
      </p>

      {error && <div className="form__error">{error}</div>}
      {success && <div className="form__success">{success}</div>}

      <form onSubmit={handleSubmit} className="form">
        <div className="form__row">
          <div className="form__field">
            <label className="form__label">显示名称</label>
            <input
              className="form__input"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="显示在个人主页的名称"
              maxLength={50}
            />
          </div>
          <div className="form__field">
            <label className="form__label">头像 URL</label>
            <input
              className="form__input"
              type="url"
              value={avatar}
              onChange={(e) => setAvatar(e.target.value)}
              placeholder="https://..."
              maxLength={500}
            />
          </div>
        </div>

        <div className="form__row">
          <div className="form__field">
            <label className="form__label">所在地</label>
            <input
              className="form__input"
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="城市/地区"
              maxLength={100}
            />
          </div>
          <div className="form__field">
            <label className="form__label">个人网站</label>
            <input
              className="form__input"
              type="url"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://..."
              maxLength={200}
            />
          </div>
        </div>

        <div className="form__field">
          <label className="form__label">个人简介</label>
          <textarea
            className="form__textarea"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="介绍一下你自己"
            rows={3}
            maxLength={500}
          />
        </div>

        <div className="form__field">
          <label className="form__label">空间背景色</label>
          <input
            className="form__input"
            type="text"
            value={profileBg}
            onChange={(e) => setProfileBg(e.target.value)}
            placeholder="#f5f5f5 或 linear-gradient(...) 等 CSS background 值"
            maxLength={500}
          />
          <p className="form__hint">
            纯 CSS background 属性值，不支持 url() 和图片。
          </p>
        </div>

        <div className="form__field">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label className="form__label" style={{ marginBottom: 0 }}>
              自定义 CSS
            </label>
            <button
              type="button"
              className="form__hint-btn"
              onClick={() => setPreviewCss(!previewCss)}
            >
              {previewCss ? '隐藏预览' : '实时预览'}
            </button>
          </div>
          <textarea
            className="form__textarea form__textarea--code"
            value={profileCss}
            onChange={(e) => setProfileCss(e.target.value)}
            placeholder={`/* 在你的个人空间内生效，作用域自动添加 */\n.user-profile__name {\n  color: #ff6b6b;\n}\n\n.user-profile__avatar img {\n  border: 3px solid gold;\n}`}
            rows={14}
            spellCheck={false}
            maxLength={10000}
          />
          <p className="form__hint">
            最大 10000 字符。不支持 url()、@import、@keyframes、expression、javascript: 等。
            选择器会自动限定在你的个人空间内，不会影响其他页面。
          </p>
          {previewCss && (
            <div
              className="css-preview"
              style={previewCss ? { background: profileBg || 'var(--bg)' } : undefined}
            >
              <div className="css-preview__inner">
                <div className="preview-avatar">{displayName ? displayName.charAt(0).toUpperCase() : user.username.charAt(0).toUpperCase()}</div>
                <h3>{displayName || user.username}</h3>
                <p>{bio || '你的自定义 CSS 会应用到个人空间页面。这是预览效果。'}</p>
              </div>
              <style>{buildScopedCss(profileCss, '.css-preview')}</style>
            </div>
          )}
        </div>

        <div className="form__actions">
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? '保存中…' : '保存修改'}
          </button>
        </div>
      </form>

      <div className="settings__section settings__section--password">
        <h2 className="settings__section-title">
          {user?.password_hash ? '修改密码' : '设置密码'}
        </h2>
        <p className="settings__section-desc">
          {user?.password_hash
            ? '修改你的登录密码。使用强密码保护你的账户安全。'
            : '你当前通过 GitHub 登录。设置密码后，也可以用用户名/邮箱 + 密码登录。'}
        </p>

        {pwdError && <div className="form__error">{pwdError}</div>}
        {pwdSuccess && <div className="form__success">{pwdSuccess}</div>}

        <form onSubmit={handlePasswordSubmit} className="form">
          {user?.password_hash && (
            <div className="form__field">
              <label className="form__label">当前密码</label>
              <input
                className="form__input"
                type="password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                placeholder="输入当前密码"
                required
              />
            </div>
          )}
          <div className="form__row">
            <div className="form__field">
              <label className="form__label">新密码</label>
              <input
                className="form__input"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="至少 8 个字符"
                minLength={8}
                required
              />
            </div>
            <div className="form__field">
              <label className="form__label">确认新密码</label>
              <input
                className="form__input"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="再次输入新密码"
                minLength={8}
                required
              />
            </div>
          </div>
          <div className="form__actions">
            <button type="submit" className="btn-primary" disabled={pwdSaving}>
              {pwdSaving ? '保存中…' : user?.password_hash ? '更新密码' : '设置密码'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function buildScopedCss(css: string, scope: string): string {
  const DANGEROUS = [
    /url\s*\(/gi,
    /expression\s*\(/gi,
    /javascript\s*:/gi,
    /data\s*:/gi,
    /@import/gi,
    /@font-face/gi,
    /@keyframes/gi,
    /behavior\s*:/gi,
    /-moz-binding/gi,
  ]
  let safe = css
  for (const p of DANGEROUS) safe = safe.replace(p, '')
  if (safe.length > 10000) safe = safe.slice(0, 10000)

  const blocks = safe.split('}')
  const result: string[] = []
  for (const block of blocks) {
    const trimmed = block.trim()
    if (!trimmed) continue
    const parts = trimmed.split('{')
    if (parts.length < 2) continue
    let selector = parts[0].trim()
    const body = parts.slice(1).join('{').trim()
    if (!selector || !body) continue
    const selectors = selector.split(',').map((s) => s.trim())
    const scoped = selectors.map((s) => {
      if (s.startsWith('::') || s.startsWith(':')) return `${scope}${s}`
      return `${scope} ${s}`
    })
    result.push(`${scoped.join(', ')} { ${body} }`)
  }
  return result.join('\n')
}
