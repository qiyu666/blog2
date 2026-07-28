import { useState, useEffect, useRef, DragEvent } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { updateProfile, getUserProfile, type UserProfile } from '../api'
import SEO from '../components/SEO'

interface SectionItem {
  id: string
  label: string
  icon: string
  description: string
}

const ALL_SECTIONS: SectionItem[] = [
  { id: 'banner', label: '横幅信息', icon: '🖼️', description: '头像、名称、简介、位置、网站等个人信息' },
  { id: 'stats', label: '统计数据', icon: '📊', description: '帖子数、评论数、获赞数、关注/粉丝数' },
  { id: 'posts', label: '帖子列表', icon: '📝', description: '展示该用户发布的所有帖子' },
  { id: 'bio', label: '关于我', icon: '👤', description: '展示详细的个人简介' },
  { id: 'social', label: '社交链接', icon: '🔗', description: '展示 GitHub、网站等外部链接' },
]

interface LayoutConfig {
  sections: { id: string; visible: boolean }[]
}

function parseLayout(raw: string): LayoutConfig {
  const defaultConfig: LayoutConfig = {
    sections: ALL_SECTIONS.map((s) => ({ id: s.id, visible: true })),
  }
  if (!raw) return defaultConfig
  try {
    const parsed = JSON.parse(raw)
    if (!parsed.sections || !Array.isArray(parsed.sections)) return defaultConfig
    // 确保所有已知 section 都在列表中
    const known = new Set(ALL_SECTIONS.map((s) => s.id))
    const existing = new Set(parsed.sections.map((s: { id: string }) => s.id))
    const result = parsed.sections.filter((s: { id: string }) => known.has(s.id))
    // 补上新增的 section
    ALL_SECTIONS.forEach((s) => {
      if (!existing.has(s.id)) {
        result.push({ id: s.id, visible: true })
      }
    })
    return { sections: result }
  } catch {
    return defaultConfig
  }
}

export default function Customize() {
  const { user, refreshUser } = useAuth()
  const [layout, setLayout] = useState<LayoutConfig>(() => parseLayout(''))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const loadedRef = useRef(false)

  useEffect(() => {
    if (!user) return
    if (loadedRef.current) return
    loadedRef.current = true
    // 从 profile 获取当前 layout
    getUserProfile(user.username)
      .then((profile: UserProfile) => {
        const raw = (profile.user as unknown as { profile_layout?: string }).profile_layout || ''
        setLayout(parseLayout(raw))
      })
      .catch(() => {})
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

  function handleDragStart(e: DragEvent, index: number) {
    setDraggedIndex(index)
    e.dataTransfer.effectAllowed = 'move'
    // Firefox 需要 setData
    e.dataTransfer.setData('text/plain', String(index))
  }

  function handleDragOver(e: DragEvent, index: number) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (draggedIndex !== null && draggedIndex !== index) {
      setDragOverIndex(index)
    }
  }

  function handleDragLeave() {
    setDragOverIndex(null)
  }

  function handleDrop(e: DragEvent, index: number) {
    e.preventDefault()
    if (draggedIndex === null || draggedIndex === index) {
      setDraggedIndex(null)
      setDragOverIndex(null)
      return
    }
    const newSections = [...layout.sections]
    const [moved] = newSections.splice(draggedIndex, 1)
    newSections.splice(index, 0, moved)
    setLayout({ sections: newSections })
    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  function handleDragEnd() {
    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  function toggleVisible(id: string) {
    setLayout({
      sections: layout.sections.map((s) =>
        s.id === id ? { ...s, visible: !s.visible } : s
      ),
    })
  }

  function moveUp(index: number) {
    if (index === 0) return
    const newSections = [...layout.sections]
    ;[newSections[index - 1], newSections[index]] = [newSections[index], newSections[index - 1]]
    setLayout({ sections: newSections })
  }

  function moveDown(index: number) {
    if (index === layout.sections.length - 1) return
    const newSections = [...layout.sections]
    ;[newSections[index], newSections[index + 1]] = [newSections[index + 1], newSections[index]]
    setLayout({ sections: newSections })
  }

  function resetLayout() {
    setLayout({
      sections: ALL_SECTIONS.map((s) => ({ id: s.id, visible: true })),
    })
  }

  async function handleSave() {
    if (!user) return
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      await updateProfile(user.username, {
        profile_layout: JSON.stringify(layout),
      } as unknown as Parameters<typeof updateProfile>[1])
      if (typeof refreshUser === 'function') {
        await refreshUser()
      }
      setSuccess('布局已保存！')
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="form-page">
      <SEO title="自定义空间 - Marginalia" description="拖动排列你的个人空间模块。" />
      <Link to={`/${user.username}`} className="back-link">← 返回我的空间</Link>
      <h1 className="form-page__title">自定义空间</h1>
      <p className="settings__page-subtitle">
        拖动卡片调整模块顺序，或点击眼睛图标显示/隐藏模块。更改保存后立即生效。
      </p>

      {error && <div className="form__error">{error}</div>}
      {success && <div className="form__success">{success}</div>}

      <div className="customize-layout">
        <div className="customize-list">
          {layout.sections.map((section, index) => {
            const meta = ALL_SECTIONS.find((s) => s.id === section.id)
            if (!meta) return null
            const isDragging = draggedIndex === index
            const isDragOver = dragOverIndex === index && draggedIndex !== null && draggedIndex !== index
            return (
              <div
                key={section.id}
                className={`customize-item ${isDragging ? 'customize-item--dragging' : ''} ${isDragOver ? 'customize-item--drag-over' : ''} ${!section.visible ? 'customize-item--hidden' : ''}`}
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
              >
                <div className="customize-item__drag-handle" title="拖动排序">
                  ⠿
                </div>
                <div className="customize-item__icon">{meta.icon}</div>
                <div className="customize-item__content">
                  <span className="customize-item__label">{meta.label}</span>
                  <span className="customize-item__desc">{meta.description}</span>
                </div>
                <div className="customize-item__actions">
                  <button
                    type="button"
                    className="customize-item__btn"
                    onClick={() => moveUp(index)}
                    disabled={index === 0}
                    title="上移"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="customize-item__btn"
                    onClick={() => moveDown(index)}
                    disabled={index === layout.sections.length - 1}
                    title="下移"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    className={`customize-item__btn ${section.visible ? '' : 'customize-item__btn--off'}`}
                    onClick={() => toggleVisible(section.id)}
                    title={section.visible ? '隐藏' : '显示'}
                  >
                    {section.visible ? '👁️' : '🚫'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        <div className="customize-preview">
          <h3 className="customize-preview__title">预览顺序</h3>
          <div className="customize-preview__list">
            {layout.sections.filter((s) => s.visible).map((section, i) => {
              const meta = ALL_SECTIONS.find((s) => s.id === section.id)
              if (!meta) return null
              return (
                <div key={section.id} className="customize-preview__item">
                  <span className="customize-preview__num">{i + 1}</span>
                  <span className="customize-preview__icon">{meta.icon}</span>
                  <span>{meta.label}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div className="form__actions">
        <button type="button" className="btn-secondary" onClick={resetLayout}>
          恢复默认
        </button>
        <button type="button" className="btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? '保存中…' : '保存布局'}
        </button>
      </div>
    </div>
  )
}
