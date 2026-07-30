import { useEffect, useState, FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { updateProfile, changePassword, getUserProfile, type ProfileUpdate } from '../api'

export default function Settings() {
  const { user, refreshUser } = useAuth()
  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')
  const [avatar, setAvatar] = useState('')
  const [location, setLocation] = useState('')
  const [website, setWebsite] = useState('')
  const [profileBg, setProfileBg] = useState('')
  const [profileCss, setProfileCss] = useState('')
  const [socialGithub, setSocialGithub] = useState('')
  const [socialTwitter, setSocialTwitter] = useState('')
  const [socialQq, setSocialQq] = useState('')
  const [socialWechat, setSocialWechat] = useState('')
  const [socialTelegram, setSocialTelegram] = useState('')
  const [socialBilibili, setSocialBilibili] = useState('')
  const [socialEmail, setSocialEmail] = useState('')
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

  // 社交字段从用户主页 API 拉取（auth/me 不返回这些字段）
  useEffect(() => {
    if (!user) return
    let active = true
    getUserProfile(user.username)
      .then((p) => {
        if (!active) return
        const u = p.user
        setSocialGithub(u.social_github || '')
        setSocialTwitter(u.social_twitter || '')
        setSocialQq(u.social_qq || '')
        setSocialWechat(u.social_wechat || '')
        setSocialTelegram(u.social_telegram || '')
        setSocialBilibili(u.social_bilibili || '')
        setSocialEmail(u.social_email || '')
      })
      .catch(() => {
        // ignore — 社交字段保持空
      })
    return () => {
      active = false
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
      social_github: socialGithub,
      social_twitter: socialTwitter,
      social_qq: socialQq,
      social_wechat: socialWechat,
      social_telegram: socialTelegram,
      social_bilibili: socialBilibili,
      social_email: socialEmail,
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

        <div className="form__field">
          <label className="form__label">社交资料</label>
          <p className="form__hint">填写后会在个人主页展示对应的社交图标，留空则不显示。</p>
          <div className="settings-social">
            <div className="settings-social__field">
              <label className="settings-social__label">
                <GithubIcon /> GitHub 用户名
              </label>
              <input
                className="form__input"
                type="text"
                value={socialGithub}
                onChange={(e) => setSocialGithub(e.target.value)}
                placeholder="octocat"
                maxLength={200}
              />
            </div>
            <div className="settings-social__field">
              <label className="settings-social__label">
                <TwitterIcon /> Twitter/X 用户名
              </label>
              <input
                className="form__input"
                type="text"
                value={socialTwitter}
                onChange={(e) => setSocialTwitter(e.target.value)}
                placeholder="username"
                maxLength={200}
              />
            </div>
            <div className="settings-social__field">
              <label className="settings-social__label">
                <QqIcon /> QQ 号
              </label>
              <input
                className="form__input"
                type="text"
                value={socialQq}
                onChange={(e) => setSocialQq(e.target.value)}
                placeholder="10001"
                maxLength={200}
              />
            </div>
            <div className="settings-social__field">
              <label className="settings-social__label">
                <WechatIcon /> 微信号
              </label>
              <input
                className="form__input"
                type="text"
                value={socialWechat}
                onChange={(e) => setSocialWechat(e.target.value)}
                placeholder="weixin_id"
                maxLength={200}
              />
            </div>
            <div className="settings-social__field">
              <label className="settings-social__label">
                <TelegramIcon /> Telegram 用户名
              </label>
              <input
                className="form__input"
                type="text"
                value={socialTelegram}
                onChange={(e) => setSocialTelegram(e.target.value)}
                placeholder="username"
                maxLength={200}
              />
            </div>
            <div className="settings-social__field">
              <label className="settings-social__label">
                <BilibiliIcon /> B站 UID
              </label>
              <input
                className="form__input"
                type="text"
                value={socialBilibili}
                onChange={(e) => setSocialBilibili(e.target.value)}
                placeholder="12345"
                maxLength={200}
              />
            </div>
            <div className="settings-social__field">
              <label className="settings-social__label">
                <EmailIcon /> 公开邮箱
              </label>
              <input
                className="form__input"
                type="email"
                value={socialEmail}
                onChange={(e) => setSocialEmail(e.target.value)}
                placeholder="you@example.com"
                maxLength={200}
              />
            </div>
          </div>
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

// ===== 社交平台内联 SVG 图标 =====
function GithubIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 .5C5.37.5 0 5.78 0 12.29c0 5.2 3.44 9.61 8.21 11.16.6.11.82-.25.82-.56 0-.28-.01-1.02-.02-2-3.34.71-4.04-1.58-4.04-1.58-.55-1.36-1.34-1.72-1.34-1.72-1.09-.73.08-.72.08-.72 1.21.08 1.85 1.22 1.85 1.22 1.07 1.8 2.81 1.28 3.5.98.11-.76.42-1.28.76-1.57-2.67-.3-5.47-1.31-5.47-5.83 0-1.29.47-2.34 1.24-3.17-.12-.3-.54-1.52.12-3.18 0 0 1.01-.32 3.3 1.21a11.6 11.6 0 0 1 6 0c2.29-1.53 3.3-1.21 3.3-1.21.66 1.66.24 2.88.12 3.18.77.83 1.24 1.88 1.24 3.17 0 4.53-2.81 5.53-5.49 5.82.43.36.81 1.08.81 2.18 0 1.58-.01 2.85-.01 3.24 0 .31.22.68.83.56A12.04 12.04 0 0 0 24 12.29C24 5.78 18.63.5 12 .5z" />
    </svg>
  )
}

function TwitterIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z" />
    </svg>
  )
}

function QqIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12.003 0c-3.314 0-6.003 2.687-6.003 6.003 0 .862.184 1.682.512 2.422-1.047.953-2.219 2.584-2.219 5.057 0 .43.05.836.123 1.219-.708.328-1.416.797-1.416 1.4 0 .9 1.275 1.612 2.146 1.93.184.589.46 1.146.785 1.62-.708.43-1.553 1.107-1.553 1.81 0 1.146 2.05 1.93 4.288 1.93.785 0 1.516-.082 2.155-.232.43.334.953.557 1.516.557s1.087-.223 1.516-.557c.64.15 1.37.232 2.155.232 2.238 0 4.288-.784 4.288-1.93 0-.703-.845-1.38-1.553-1.81.326-.474.601-1.031.785-1.62.871-.318 2.146-1.03 2.146-1.93 0-.603-.708-1.072-1.416-1.4.073-.383.123-.789.123-1.219 0-2.473-1.172-4.104-2.219-5.057.328-.74.512-1.56.512-2.422C18.006 2.687 15.317 0 12.003 0z" />
    </svg>
  )
}

function WechatIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 0 1 .213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 0 0 .167-.054l1.903-1.114a.864.864 0 0 1 .717-.098 10.16 10.16 0 0 0 2.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-.576-3.583-4.196-6.348-8.596-6.348zM5.785 5.991c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178A1.17 1.17 0 0 1 4.623 7.17c0-.651.52-1.18 1.162-1.18zm5.813 0c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178 1.17 1.17 0 0 1-1.162-1.178c0-.651.52-1.18 1.162-1.18zm5.34 2.86c-1.797-.052-3.746.512-5.28 1.786-1.72 1.428-2.687 3.72-1.78 6.22.942 2.453 3.666 4.229 6.884 4.229.826 0 1.622-.12 2.361-.336a.722.722 0 0 1 .598.082l1.584.926a.272.272 0 0 0 .14.047c.134 0 .24-.111.24-.247 0-.06-.023-.12-.038-.177l-.327-1.233a.582.582 0 0 1 .193-.555C23.156 18.437 24 16.743 24 14.886c0-3.302-3.05-5.989-6.84-6.034zm-2.293 3.2c.534 0 .967.44.967.983a.976.976 0 0 1-.967.984.976.976 0 0 1-.967-.984c0-.543.433-.983.967-.983zm4.844 0c.534 0 .967.44.967.983a.976.976 0 0 1-.967.984.976.976 0 0 1-.967-.984c0-.543.433-.983.967-.983z" />
    </svg>
  )
}

function TelegramIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.324-.437.89-.663 3.478-1.474 5.797-2.448 6.956-2.924 3.315-1.386 4.006-1.627 4.456-1.636z" />
    </svg>
  )
}

function BilibiliIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.813 4.653h.854c1.51.054 2.769.578 3.773 1.574 1.004.995 1.524 2.249 1.56 3.76v7.36c-.036 1.51-.556 2.769-1.56 3.773s-2.262 1.524-3.773 1.56H5.333c-1.51-.036-2.769-.556-3.773-1.56S.036 18.858 0 17.347v-7.36c.036-1.511.556-2.765 1.56-3.76 1.004-.996 2.262-1.52 3.773-1.574h.774l-1.174-1.12a1.234 1.234 0 0 1-.373-.906c0-.356.124-.658.373-.907l.027-.027c.267-.249.573-.373.92-.373.347 0 .653.124.92.373L9.653 4.44c.071.071.134.142.187.213h4.267a.836.836 0 0 1 .16-.213l2.853-2.747c.267-.249.573-.373.92-.373.347 0 .662.151.929.4.267.249.391.551.391.907 0 .355-.124.657-.373.906L17.813 4.653zM5.333 7.24c-.746.018-1.373.276-1.88.773-.506.498-.769 1.13-.786 1.894v7.52c.017.764.28 1.395.786 1.893.507.498 1.134.756 1.88.773h13.334c.746-.017 1.373-.275 1.88-.773.506-.498.769-1.129.786-1.893v-7.52c-.017-.764-.28-1.396-.786-1.894-.507-.497-1.134-.755-1.88-.773H5.333zM8 11.107c.373 0 .684.124.933.373.25.249.383.569.4.96v1.173c-.017.391-.15.711-.4.96-.249.249-.56.373-.933.373s-.684-.124-.933-.373c-.25-.249-.383-.569-.4-.96V12.44c0-.373.129-.689.387-.947.258-.257.574-.386.946-.386zm8 0c.373 0 .684.124.933.373.25.249.383.569.4.96v1.173c-.017.391-.15.711-.4.96-.249.249-.56.373-.933.373s-.684-.124-.933-.373c-.25-.249-.383-.569-.4-.96V12.44c0-.373.129-.689.387-.947.258-.257.574-.386.946-.386z" />
    </svg>
  )
}

function EmailIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
    </svg>
  )
}
