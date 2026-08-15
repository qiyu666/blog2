import { useEffect, useState, useRef, FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { updateProfile, changePassword, getUserProfile, getTwoFactorStatus, setupTwoFactor, enableTwoFactor, disableTwoFactor, type ProfileUpdate, type TwoFactorSetup } from '../api'

// imgbb 图床上传通过后端代理 /api/upload-avatar，API Key 存在服务端环境变量中

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
  const [socialFacebook, setSocialFacebook] = useState('')
  const [socialWhatsapp, setSocialWhatsapp] = useState('')
  const [tippingWechatQr, setTippingWechatQr] = useState('')
  const [tippingAlipayQr, setTippingAlipayQr] = useState('')
  const [tippingWechatUploading, setTippingWechatUploading] = useState(false)
  const [tippingAlipayUploading, setTippingAlipayUploading] = useState(false)
  const tippingWechatFileRef = useRef<HTMLInputElement | null>(null)
  const tippingAlipayFileRef = useRef<HTMLInputElement | null>(null)
  const [tippingWechatDrag, setTippingWechatDrag] = useState(false)
  const [tippingAlipayDrag, setTippingAlipayDrag] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [justSaved, setJustSaved] = useState(false)
  const [previewCss, setPreviewCss] = useState(false)

  // 头像上传相关状态
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [avatarUploadError, setAvatarUploadError] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const dragCounterRef = useRef(0)
  const avatarFileRef = useRef<HTMLInputElement | null>(null)

  // 阻止页面默认拖拽行为（防止浏览器直接打开拖拽的文件）
  useEffect(() => {
    function preventDefault(e: DragEvent) {
      e.preventDefault()
    }
    // 只在 document 上阻止默认行为，不 stopPropagation，避免干扰 React 合成事件
    document.addEventListener('dragover', preventDefault)
    document.addEventListener('drop', preventDefault)
    return () => {
      document.removeEventListener('dragover', preventDefault)
      document.removeEventListener('drop', preventDefault)
    }
  }, [])

  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [pwdSaving, setPwdSaving] = useState(false)
  const [pwdError, setPwdError] = useState('')
  const [pwdSuccess, setPwdSuccess] = useState('')

  // 2FA 状态
  const [totpEnabled, setTotpEnabled] = useState(false)
  const [totpSetup, setTotpSetup] = useState<TwoFactorSetup | null>(null)
  const [totpCode, setTotpCode] = useState('')
  const [totpLoading, setTotpLoading] = useState(false)
  const [totpError, setTotpError] = useState('')
  const [totpSuccess, setTotpSuccess] = useState('')

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
        setSocialFacebook(u.social_facebook || '')
        setSocialWhatsapp(u.social_whatsapp || '')
      })
      .catch(() => {
        // ignore — 社交字段保持空
      })
    return () => {
      active = false
    }
  }, [user])

  // 拉取 2FA 状态
  useEffect(() => {
    if (!user) return
    let active = true
    getTwoFactorStatus()
      .then((s) => {
        if (active) setTotpEnabled(s.enabled)
      })
      .catch(() => {
        // ignore
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

  /** 客户端压缩图片到指定尺寸，返回 base64（不含 data: 前缀） */
  function compressImage(file: File, maxSize = 512): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const img = new Image()
        img.onload = () => {
          let { width, height } = img
          if (width > height) {
            if (width > maxSize) {
              height = Math.round((height * maxSize) / width)
              width = maxSize
            }
          } else {
            if (height > maxSize) {
              width = Math.round((width * maxSize) / height)
              height = maxSize
            }
          }
          const canvas = document.createElement('canvas')
          canvas.width = width
          canvas.height = height
          const ctx = canvas.getContext('2d')
          if (!ctx) {
            reject(new Error('无法创建 canvas 上下文'))
            return
          }
          ctx.drawImage(img, 0, 0, width, height)
          // JPEG 压缩质量 0.85，体积小、画质够用
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
          resolve(dataUrl.split(',')[1])
        }
        img.onerror = () => reject(new Error('图片加载失败'))
        img.src = e.target?.result as string
      }
      reader.onerror = () => reject(new Error('文件读取失败'))
      reader.readAsDataURL(file)
    })
  }

  /** 核心上传逻辑：校验 + 压缩 + POST 到后端代理，成功后写入 avatar 状态 */
  async function uploadAvatarFile(file: File) {
    setAvatarUploadError('')

    // 校验文件类型
    if (!file.type.startsWith('image/')) {
      setAvatarUploadError('请选择图片文件（PNG / JPG / WebP 等）')
      return
    }

    // 校验文件大小（10MB 上限，压缩前）
    if (file.size > 10 * 1024 * 1024) {
      setAvatarUploadError('图片大小不能超过 10MB')
      return
    }

    setAvatarUploading(true)
    try {
      // 客户端压缩到 512px，节省流量
      const base64 = await compressImage(file, 512)

      // 通过后端代理上传，API Key 不暴露在前端
      const res = await fetch('/api/upload-avatar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64 }),
      })

      if (!res.ok) {
        const errBody = await res.json().catch(() => null)
        throw new Error(errBody?.error || `HTTP ${res.status}`)
      }

      const data = await res.json()
      if (data?.url) {
        setAvatar(data.url)
      } else {
        throw new Error('返回数据格式异常')
      }
    } catch (err) {
      setAvatarUploadError(err instanceof Error ? err.message : '上传失败')
    } finally {
      setAvatarUploading(false)
      // 重置 input，允许重复选择同一文件
      if (avatarFileRef.current) avatarFileRef.current.value = ''
    }
  }

  /** 处理头像本地上传（来自 input file 选择） */
  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    await uploadAvatarFile(file)
  }

  /** dragenter：计数器 +1，首次进入时高亮 */
  function handleDragEnter(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    e.stopPropagation()
    dragCounterRef.current += 1
    if (dragCounterRef.current === 1) {
      setIsDragging(true)
    }
  }

  /** dragover：必须阻止默认行为并设置 dropEffect，浏览器才允许 drop */
  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    e.stopPropagation()
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'copy'
    }
  }

  /** dragleave：计数器 -1，真正离开 dropzone 时才取消高亮 */
  function handleDragLeave(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    e.stopPropagation()
    dragCounterRef.current -= 1
    if (dragCounterRef.current <= 0) {
      dragCounterRef.current = 0
      setIsDragging(false)
    }
  }

  /** drop：重置计数器，取出第一个文件并上传 */
  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    e.stopPropagation()
    dragCounterRef.current = 0
    setIsDragging(false)
    if (avatarUploading) return
    const file = e.dataTransfer.files?.[0]
    if (file) {
      void uploadAvatarFile(file)
    }
  }

  async function uploadTippingFile(file: File, setUrl: React.Dispatch<React.SetStateAction<string>>, setUploading: React.Dispatch<React.SetStateAction<boolean>>) {
    if (!file.type.startsWith('image/') || file.size > 10 * 1024 * 1024) return
    setUploading(true)
    try {
      const base64 = await compressImage(file, 512)
      const res = await fetch('/api/upload-avatar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64 }),
      })
      if (!res.ok) throw new Error('上传失败')
      const data = await res.json() as { data?: { link?: string } }
      const url = data?.data?.link
      if (url) setUrl(url)
    } finally {
      setUploading(false)
    }
  }

  function handleTippingWechatDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    e.stopPropagation()
    setTippingWechatDrag(false)
    if (tippingWechatUploading) return
    const file = e.dataTransfer.files?.[0]
    if (file) void uploadTippingFile(file, setTippingWechatQr, setTippingWechatUploading)
  }

  function handleTippingAlipayDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    e.stopPropagation()
    setTippingAlipayDrag(false)
    if (tippingAlipayUploading) return
    const file = e.dataTransfer.files?.[0]
    if (file) void uploadTippingFile(file, setTippingAlipayQr, setTippingAlipayUploading)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!user) return
    setError('')
    setSuccess('')
    setJustSaved(false)
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
      social_facebook: socialFacebook,
      social_whatsapp: socialWhatsapp,
      tipping_wechat_qr: tippingWechatQr,
      tipping_alipay_qr: tippingAlipayQr,
    }

    try {
      const res = await updateProfile(user.username, data)
      if (res.warning) {
        // 社交字段未保存（数据库未迁移）
        setError(res.warning)
      } else {
        setSuccess('资料已保存')
        setJustSaved(true)
        setTimeout(() => setJustSaved(false), 3000)
      }
      // 滚动到顶部，让用户看到提示
      window.scrollTo({ top: 0, behavior: 'smooth' })
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

  // 2FA：生成密钥
  async function handleTotpSetup() {
    setTotpError('')
    setTotpSuccess('')
    setTotpCode('')
    setTotpLoading(true)
    try {
      const data = await setupTwoFactor()
      setTotpSetup(data)
    } catch (err) {
      setTotpError(err instanceof Error ? err.message : '生成密钥失败')
    } finally {
      setTotpLoading(false)
    }
  }

  // 2FA：验证并启用
  async function handleTotpEnable(e: FormEvent) {
    e.preventDefault()
    setTotpError('')
    setTotpSuccess('')
    if (!/^\d{6}$/.test(totpCode.trim())) {
      setTotpError('请输入 6 位验证码')
      return
    }
    setTotpLoading(true)
    try {
      const res = await enableTwoFactor(totpCode.trim())
      setTotpEnabled(true)
      setTotpSetup(null)
      setTotpCode('')
      setTotpSuccess(res.message || '两步验证已开启')
    } catch (err) {
      setTotpError(err instanceof Error ? err.message : '验证失败')
    } finally {
      setTotpLoading(false)
    }
  }

  // 2FA：关闭
  async function handleTotpDisable(e: FormEvent) {
    e.preventDefault()
    setTotpError('')
    setTotpSuccess('')
    if (!/^\d{6}$/.test(totpCode.trim())) {
      setTotpError('请输入 6 位验证码')
      return
    }
    setTotpLoading(true)
    try {
      const res = await disableTwoFactor(totpCode.trim())
      setTotpEnabled(false)
      setTotpCode('')
      setTotpSuccess(res.message || '两步验证已关闭')
    } catch (err) {
      setTotpError(err instanceof Error ? err.message : '验证失败')
    } finally {
      setTotpLoading(false)
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

      {/* 头像本地上传区域样式（内联，避免依赖 index.css 的大文件推送） */}
      <style>{`
        .avatar-upload {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-top: 0.5rem;
          flex-wrap: wrap;
        }
        .avatar-upload__preview {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          object-fit: cover;
          border: 2px solid var(--line);
          background: var(--bg-soft, #f5f5f5);
        }
        .avatar-upload .btn-secondary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }
        /* 拖拽 dropzone */
        .avatar-dropzone {
          margin-top: 0.5rem;
          padding: 1.25rem 1rem;
          border: 2px dashed var(--line, #d1d5db);
          border-radius: 12px;
          background: var(--bg-soft, rgba(0, 0, 0, 0.02));
          display: flex;
          align-items: center;
          gap: 1rem;
          flex-wrap: wrap;
          cursor: pointer;
          transition: border-color 0.18s ease, background 0.18s ease, transform 0.18s ease;
          position: relative;
        }
        .avatar-dropzone:hover {
          border-color: var(--accent, #f97316);
        }
        .avatar-dropzone--dragging {
          border-color: var(--accent, #f97316);
          border-style: solid;
          background: rgba(249, 115, 22, 0.08);
          transform: scale(1.01);
        }
        .avatar-dropzone__icon {
          font-size: 1.75rem;
          line-height: 1;
          filter: grayscale(0.2);
        }
        .avatar-dropzone__text {
          display: flex;
          flex-direction: column;
          gap: 0.15rem;
          flex: 1;
          min-width: 180px;
        }
        .avatar-dropzone__title {
          font-size: 0.92rem;
          font-weight: 600;
          color: var(--text, #1f2937);
        }
        .avatar-dropzone__hint {
          font-size: 0.78rem;
          color: var(--text-soft, #6b7280);
        }
        .avatar-dropzone__preview {
          width: 56px;
          height: 56px;
          border-radius: 50%;
          object-fit: cover;
          border: 2px solid var(--line, #d1d5db);
          background: var(--bg, #f5f5f5);
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
        }
        .avatar-dropzone__uploading {
          font-size: 0.82rem;
          color: var(--accent, #f97316);
          font-weight: 600;
        }
      `}</style>

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
            {/* 拖拽上传区域：点击或拖拽图片到此处即可上传 */}
            <div
              className={`avatar-dropzone ${isDragging ? 'avatar-dropzone--dragging' : ''}`}
              onDragEnter={handleDragEnter}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => !avatarUploading && avatarFileRef.current?.click()}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if ((e.key === 'Enter' || e.key === ' ') && !avatarUploading) {
                  e.preventDefault()
                  avatarFileRef.current?.click()
                }
              }}
              aria-label="拖拽或点击上传头像"
            >
              {avatar && !avatarUploading ? (
                <img
                  src={avatar}
                  alt="当前头像预览"
                  className="avatar-dropzone__preview"
                  onError={(e) => {
                    ;(e.target as HTMLImageElement).style.display = 'none'
                  }}
                />
              ) : (
                <span className="avatar-dropzone__icon" aria-hidden="true">
                  {avatarUploading ? '⏳' : '🖼️'}
                </span>
              )}
              <div className="avatar-dropzone__text">
                {avatarUploading ? (
                  <span className="avatar-dropzone__uploading">正在上传…</span>
                ) : (
                  <span className="avatar-dropzone__title">
                    {isDragging ? '松开鼠标即可上传' : '拖拽图片到此处，或点击选择文件'}
                  </span>
                )}
                <span className="avatar-dropzone__hint">
                  支持 PNG / JPG / WebP / GIF，自动压缩到 512px，最大 10MB
                </span>
              </div>
              {!avatarUploading && (
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={(e) => {
                    e.stopPropagation()
                    avatarFileRef.current?.click()
                  }}
                  disabled={avatarUploading}
                  style={{ fontSize: '0.85rem', padding: '0.45rem 0.9rem' }}
                >
                  选择文件
                </button>
              )}
              <input
                ref={avatarFileRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleAvatarUpload}
              />
            </div>
            {avatarUploadError && (
              <p className="form__hint" style={{ color: 'var(--danger, #ef4444)' }}>
                {avatarUploadError}
              </p>
            )}
            <p className="form__hint">
              支持拖拽 / 点击本地上传（自动压缩到 512px），也可直接粘贴外链。
            </p>
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
            <div className="settings-social__field">
              <label className="settings-social__label">
                <FacebookIcon /> Facebook ID
              </label>
              <input
                className="form__input"
                type="text"
                value={socialFacebook}
                onChange={(e) => setSocialFacebook(e.target.value)}
                placeholder="100000000000000"
                maxLength={200}
              />
            </div>
            <div className="settings-social__field">
              <label className="settings-social__label">
                <WhatsappIcon /> WhatsApp 号码
              </label>
              <input
                className="form__input"
                type="text"
                value={socialWhatsapp}
                onChange={(e) => setSocialWhatsapp(e.target.value)}
                placeholder="+86 13800138000"
                maxLength={50}
              />
            </div>
          </div>
          <div className="settings-tipping">
            <div className="settings-tipping__field">
              <label className="settings-tipping__label">
                <WeChatBrandIcon /> 微信收款二维码
              </label>
              <div
                className={`tipping-upload ${tippingWechatDrag ? 'tipping-upload--drag' : ''}`}
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setTippingWechatDrag(true) }}
                onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setTippingWechatDrag(false) }}
                onDrop={handleTippingWechatDrop}
                onClick={() => tippingWechatFileRef.current?.click()}
              >
                {tippingWechatQr ? (
                  <img src={tippingWechatQr} alt="微信收款二维码" className="tipping-upload__preview" />
                ) : (
                  <>
                    <span className="tipping-upload__placeholder-icon">+</span>
                    <span className="tipping-upload__text">{tippingWechatUploading ? '上传中…' : '点击或拖拽上传'}</span>
                  </>
                )}
                <input ref={tippingWechatFileRef} type="file" accept="image/*" className="tipping-upload__input" onChange={(e) => { const f = e.target.files?.[0]; if (f) void uploadTippingFile(f, setTippingWechatQr, setTippingWechatUploading); e.target.value = '' }} />
              </div>
              <input
                className="form__input form__input--url"
                type="text"
                value={tippingWechatQr}
                onChange={(e) => setTippingWechatQr(e.target.value)}
                placeholder="https://example.com/wechat-qr.png"
                maxLength={1000}
              />
            </div>
            <div className="settings-tipping__field">
              <label className="settings-tipping__label">
                <AlipayBrandIcon /> 支付宝收款二维码
              </label>
              <div
                className={`tipping-upload ${tippingAlipayDrag ? 'tipping-upload--drag' : ''}`}
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setTippingAlipayDrag(true) }}
                onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setTippingAlipayDrag(false) }}
                onDrop={handleTippingAlipayDrop}
                onClick={() => tippingAlipayFileRef.current?.click()}
              >
                {tippingAlipayQr ? (
                  <img src={tippingAlipayQr} alt="支付宝收款二维码" className="tipping-upload__preview" />
                ) : (
                  <>
                    <span className="tipping-upload__placeholder-icon">+</span>
                    <span className="tipping-upload__text">{tippingAlipayUploading ? '上传中…' : '点击或拖拽上传'}</span>
                  </>
                )}
                <input ref={tippingAlipayFileRef} type="file" accept="image/*" className="tipping-upload__input" onChange={(e) => { const f = e.target.files?.[0]; if (f) void uploadTippingFile(f, setTippingAlipayQr, setTippingAlipayUploading); e.target.value = '' }} />
              </div>
              <input
                className="form__input form__input--url"
                type="text"
                value={tippingAlipayQr}
                onChange={(e) => setTippingAlipayQr(e.target.value)}
                placeholder="https://example.com/alipay-qr.png"
                maxLength={1000}
              />
            </div>
          </div>
        </div>

        <div className="form__actions">
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? '保存中…' : justSaved ? '✓ 已保存' : '保存修改'}
          </button>
        </div>
      </form>

      {/* 第三方账号绑定：GitHub OAuth */}
      <div className="settings__section settings__section--oauth">
        <h2 className="settings__section-title">第三方账号</h2>
        <p className="settings__section-desc">
          绑定 GitHub 账号后，可以使用 GitHub 快速登录，并在个人主页展示 GitHub 图标。
        </p>
        <div className="oauth-bind-card">
          <div className="oauth-bind-card__icon">
            <GithubIcon />
          </div>
          <div className="oauth-bind-card__info">
            <div className="oauth-bind-card__name">GitHub</div>
            {/* 已通过 GitHub 注册（无密码）或已设置 social_github 视为已绑定 */}
            {(!user.password_hash || socialGithub) ? (
              <div className="oauth-bind-card__status oauth-bind-card__status--bound">
                {socialGithub ? (
                  <>已绑定：@{socialGithub}</>
                ) : (
                  <>已通过 GitHub 登录</>
                )}
              </div>
            ) : (
              <div className="oauth-bind-card__status oauth-bind-card__status--unbound">
                未绑定
              </div>
            )}
          </div>
          <div className="oauth-bind-card__action">
            {/* 已绑定但仍想重新绑定（例如更换账号）也允许 */}
            <button
              type="button"
              className="btn-primary"
              onClick={() => { window.location.href = '/api/auth/github?bind=1' }}
            >
              {(!user.password_hash || socialGithub) ? '重新绑定' : '绑定 GitHub'}
            </button>
          </div>
        </div>
      </div>

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

      {/* 安全：两步验证 (TOTP) */}
      <div className="settings__section settings__section--security">
        <h2 className="settings__section-title">两步验证（2FA）</h2>
        <p className="settings__section-desc">
          使用 Google Authenticator、Authy 等验证器 App 生成动态验证码，为账户增加一层额外保护。
          开启后，登录时除了用户名和密码外，还需要输入验证码。
        </p>

        {totpError && <div className="form__error">{totpError}</div>}
        {totpSuccess && <div className="form__success">{totpSuccess}</div>}

        {totpEnabled ? (
          // 已开启 2FA：显示状态 + 关闭表单
          <div className="totp-status totp-status--on">
            <div className="totp-status__badge">
              <span className="totp-status__dot">●</span> 已开启
            </div>
            <p className="totp-status__hint">
              你的账户已启用两步验证。关闭后需要重新设置才能再次开启。
            </p>
            <form onSubmit={handleTotpDisable} className="form">
              <div className="form__field">
                <label className="form__label">输入验证码以关闭两步验证</label>
                <input
                  className="form__input"
                  type="text"
                  inputMode="numeric"
                  pattern="\d{6}"
                  maxLength={6}
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="6 位验证码"
                  disabled={totpLoading}
                />
              </div>
              <div className="form__actions">
                <button type="submit" className="btn-primary" disabled={totpLoading || totpCode.length !== 6}>
                  {totpLoading ? '验证中…' : '关闭两步验证'}
                </button>
              </div>
            </form>
          </div>
        ) : totpSetup ? (
          // 设置流程：显示密钥 + 验证码输入
          <div className="totp-setup">
            <div className="totp-setup__step">
              <h3 className="totp-setup__step-title">第 1 步：扫码或手动输入密钥</h3>
              <p className="totp-setup__step-desc">
                在验证器 App 中扫描下方二维码，或手动输入密钥。
              </p>
              <div className="totp-setup__qr">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(totpSetup.otpauth_url)}`}
                  alt="2FA 二维码"
                  width={200}
                  height={200}
                  loading="lazy"
                />
              </div>
              <div className="totp-setup__secret">
                <label className="form__label">手动输入密钥</label>
                <code className="totp-setup__secret-code">{totpSetup.secret}</code>
              </div>
            </div>
            <form onSubmit={handleTotpEnable} className="form totp-setup__step">
              <h3 className="totp-setup__step-title">第 2 步：输入验证码确认</h3>
              <p className="totp-setup__step-desc">
                输入验证器 App 上显示的 6 位验证码完成绑定。
              </p>
              <div className="form__field">
                <label className="form__label">验证码</label>
                <input
                  className="form__input"
                  type="text"
                  inputMode="numeric"
                  pattern="\d{6}"
                  maxLength={6}
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="6 位验证码"
                  disabled={totpLoading}
                  autoFocus
                />
              </div>
              <div className="form__actions">
                <button type="submit" className="btn-primary" disabled={totpLoading || totpCode.length !== 6}>
                  {totpLoading ? '验证中…' : '确认开启'}
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    setTotpSetup(null)
                    setTotpCode('')
                    setTotpError('')
                  }}
                  disabled={totpLoading}
                >
                  取消
                </button>
              </div>
            </form>
          </div>
        ) : (
          // 未开启 2FA：显示开启按钮
          <div className="totp-status totp-status--off">
            <div className="totp-status__badge totp-status__badge--off">
              <span className="totp-status__dot">●</span> 未开启
            </div>
            <p className="totp-status__hint">
              开启两步验证后，即使密码泄露，他人也无法登录你的账户。
            </p>
            <div className="form__actions">
              <button
                type="button"
                className="btn-primary"
                onClick={handleTotpSetup}
                disabled={totpLoading}
              >
                {totpLoading ? '生成中…' : '开启两步验证'}
              </button>
            </div>
          </div>
        )}
      </div>

      {success && (
        <div className="toast toast--success">{success}</div>
      )}
      {error && (
        <div className="toast toast--error">{error}</div>
      )}
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

function WeChatBrandIcon() {
  return (
    <svg className="tipping-brand-icon tipping-brand-icon--wechat" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 0 1 .213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 0 0 .167-.054l1.903-1.114a.864.864 0 0 1 .717-.098 10.16 10.16 0 0 0 2.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-.576-3.583-4.196-6.348-8.596-6.348zM5.785 5.991c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178A1.17 1.17 0 0 1 4.623 7.17c0-.651.52-1.18 1.162-1.18zm5.813 0c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178 1.17 1.17 0 0 1-1.162-1.178c0-.651.52-1.18 1.162-1.18zm5.34 2.86c-1.797-.052-3.746.512-5.28 1.786-1.72 1.428-2.687 3.72-1.78 6.22.942 2.453 3.666 4.229 6.884 4.229.826 0 1.622-.12 2.361-.336a.722.722 0 0 1 .598.082l1.584.926a.272.272 0 0 0 .14.047c.134 0 .24-.111.24-.247 0-.06-.023-.12-.038-.177l-.327-1.233a.582.582 0 0 1 .193-.555C23.156 18.437 24 16.743 24 14.886c0-3.302-3.05-5.989-6.84-6.034zm-2.293 3.2c.534 0 .967.44.967.983a.976.976 0 0 1-.967.984.976.976 0 0 1-.967-.984c0-.543.433-.983.967-.983zm4.844 0c.534 0 .967.44.967.983a.976.976 0 0 1-.967.984.976.976 0 0 1-.967-.984c0-.543.433-.983.967-.983z" />
    </svg>
  )
}

function AlipayBrandIcon() {
  return (
    <svg className="tipping-brand-icon" viewBox="0 0 1024 1024" width="128" height="128" fill="currentColor" aria-hidden="true" style={{ color: '#1677ff' }}>
      <path fill-rule="evenodd" d="M557.208 129c3.69 0 6.715 2.952 6.715 6.648v114.55h243.802c3.742 0 6.636 3.111 6.649 6.847c.013 23.918-6.052 54.683-19.855 54.683H563.936v81.1h166.189c7.684 0 13.803 6.515 13.245 14.186l-.114 1.506c-.693 90.203-30.622 180.642-79.52 259.653l8.719 3.815c77.295 33.478 162.142 60.85 267.142 64.14c11.758.373 20.925 10.294 20.38 22.067l-.203 3.95C956.441 821.72 939.781 895 879.932 895c-8.805 0-17.288-.55-25.48-1.61c-78.043-9.254-156.284-57.05-236.322-110.267l-17.33-11.576l-13.15-8.825c-21.444 21.146-44.82 40.396-69.989 57.25c-6.193 4.013-12.734 7.703-19.573 11.076c-65.509 39.18-142.208 62.608-227.418 62.62c-118.203 0-204.921-77.972-206.644-175.9L64 714.815l.026-1.699c1.666-98.12 84.776-175.172 203.013-176.719l3.63-.023c102.924 0 186.663 33.532 270.481 73.137l.444.381l1.703-3.469c21.265-44.145 36.438-94.95 42.736-152.06l-324.798-.005a6.64 6.64 0 0 1-6.636-6.621c-.04-21.857 5.999-54.909 19.854-54.909h162.088v-81.1H191.93c-3.743 0-6.636-3.098-6.636-6.847c-.014-22.615 6.052-54.683 19.854-54.683h231.393v-64.853l.029-1.985c.908-30.931 23.72-54.36 120.638-54.36M256.896 619c-74.766 0-136.529 39.934-137.877 95.601L119 715.86l.079 3.241a92.6 92.6 0 0 0 1.584 13.643C140.92 829.238 340.818 862.454 485 696.15l-8.031-4.72C405.949 650.109 332.94 619 256.896 619"/>
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

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  )
}

function WhatsappIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  )
}
