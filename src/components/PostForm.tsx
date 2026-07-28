import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import type { PostInput } from '../types'
import MarkdownEditor from './MarkdownEditor'

interface Props {
  initial?: Partial<PostInput>
  mode?: 'new' | 'edit'
  /** 旧版兼容：单按钮提交 */
  onSubmit?: (data: PostInput) => Promise<void>
  submitLabel?: string
  /** 新版：发布 */
  onPublish?: (data: PostInput) => Promise<void>
  /** 新版：保存草稿 */
  onSaveDraft?: (data: PostInput) => Promise<void>
  editingId?: number
}

const CATEGORIES = ['随笔', '技术', '文化', '摄影', '综合']

// 预设自定义脚本示例
const PRESET_BG_GRADIENT = `// 渐变背景动画 — 为文章添加流动的渐变背景
(function() {
  var bg = document.createElement('div');
  bg.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:-1;opacity:0.15;';
  bg.style.background = 'linear-gradient(-45deg, #ee7752, #e73c7e, #23a6d5, #23d5ab)';
  bg.style.backgroundSize = '400% 400%';
  bg.style.animation = 'gradientBG 15s ease infinite';
  document.body.appendChild(bg);
  var style = document.createElement('style');
  style.textContent = '@keyframes gradientBG { 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }';
  document.head.appendChild(style);
})();`

const PRESET_SNOW = `// 飘雪特效 — 文章页飘落的雪花
(function() {
  var canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:9999;';
  document.body.appendChild(canvas);
  var ctx = canvas.getContext('2d');
  function resize() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
  resize();
  window.addEventListener('resize', resize);
  var flakes = [];
  for (var i = 0; i < 60; i++) {
    flakes.push({ x: Math.random() * canvas.width, y: Math.random() * canvas.height, r: Math.random() * 3 + 1, s: Math.random() + 0.5 });
  }
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.beginPath();
    for (var i = 0; i < flakes.length; i++) {
      var f = flakes[i];
      ctx.moveTo(f.x, f.y);
      ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
      f.y += f.s;
      f.x += Math.sin(f.y * 0.01) * 0.5;
      if (f.y > canvas.height) { f.y = -10; f.x = Math.random() * canvas.width; }
    }
    ctx.fill();
    requestAnimationFrame(draw);
  }
  draw();
})();`

const PRESET_MUSIC = `/*MUSIC_PLAYER*/
[
  {"title": "歌曲名称1", "url": "https://example.com/music1.mp3"},
  {"title": "歌曲名称2", "url": "https://example.com/music2.mp3"},
  {"title": "歌曲名称3", "url": "https://example.com/music3.mp3"}
]
/*END*/
// 使用说明：修改上面的歌曲名和链接即可，播放器会自动渲染。`

const PRESET_TYPING = `// 打字机效果 — 文章标题逐字显示
(function() {
  var title = document.querySelector('.article__title');
  if (!title) return;
  var text = title.textContent;
  title.textContent = '';
  title.style.borderRight = '2px solid var(--accent)';
  var i = 0;
  function type() {
    if (i < text.length) {
      title.textContent += text.charAt(i);
      i++;
      setTimeout(type, 80);
    } else {
      setInterval(function() {
        title.style.borderRightColor = title.style.borderRightColor === 'transparent' ? 'var(--accent)' : 'transparent';
      }, 500);
    }
  }
  setTimeout(type, 500);
})();`

interface DraftData {
  form: PostInput
  savedAt: number
}

function draftKey(editingId?: number) {
  return `post-draft-${editingId || 'new'}`
}

/** 从 Markdown 提取纯文本 */
function extractPlainText(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^[-*]\s+/gm, '')
    .replace(/^>\s+/gm, '')
    .replace(/\n+/g, ' ')
    .trim()
}

/** 计算字数和阅读时间 */
function calcStats(text: string) {
  const cnChars = (text.match(/[\u4e00-\u9fff]/g) || []).length
  const enWords = (text.match(/[a-zA-Z]+/g) || []).length
  const total = cnChars + enWords
  const minutes = Math.max(1, Math.ceil(cnChars / 300 + enWords / 200))
  return { cnChars, enWords, total, minutes }
}

export default function PostForm({
  initial,
  mode = 'edit',
  onSubmit,
  submitLabel = '保存',
  onPublish,
  onSaveDraft,
  editingId,
}: Props) {
  const [form, setForm] = useState<PostInput>({
    title: initial?.title ?? '',
    excerpt: initial?.excerpt ?? '',
    content: initial?.content ?? '',
    category: initial?.category ?? '随笔',
    tags: initial?.tags ?? '',
    cover_image: initial?.cover_image ?? '',
    published: initial?.published ?? 1,
    custom_js: initial?.custom_js ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [showDraftBanner, setShowDraftBanner] = useState(false)
  const [savedHintVisible, setSavedHintVisible] = useState(false)
  const [tagInput, setTagInput] = useState('')
  const [coverPreviewError, setCoverPreviewError] = useState(false)
  const [showSettings, setShowSettings] = useState(false)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const savedHintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mountedRef = useRef(false)
  const tagInputRef = useRef<HTMLInputElement>(null)

  const tagsArray = useMemo(() => {
    return form.tags
      .split(/[,，]/)
      .map((t) => t.trim())
      .filter(Boolean)
  }, [form.tags])

  const stats = useMemo(() => calcStats(extractPlainText(form.content)), [form.content])

  // On mount: check for a saved draft.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(draftKey(editingId))
      if (!raw) return
      const draft: DraftData = JSON.parse(raw)
      if (editingId) {
        setForm(draft.form)
      } else {
        setShowDraftBanner(true)
      }
    } catch {
      // ignore malformed draft
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Debounced auto-save
  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true
      return
    }
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      try {
        const data: DraftData = { form, savedAt: Date.now() }
        localStorage.setItem(draftKey(editingId), JSON.stringify(data))
        setSavedHintVisible(true)
        if (savedHintTimerRef.current) clearTimeout(savedHintTimerRef.current)
        savedHintTimerRef.current = setTimeout(() => setSavedHintVisible(false), 2000)
      } catch {
        // ignore quota / serialization errors
      }
    }, 1500)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [form, editingId])

  useEffect(() => {
    return () => {
      if (savedHintTimerRef.current) clearTimeout(savedHintTimerRef.current)
    }
  }, [])

  const update = useCallback(<K extends keyof PostInput>(key: K, value: PostInput[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }, [])

  function restoreDraft() {
    try {
      const raw = localStorage.getItem(draftKey(editingId))
      if (raw) {
        const draft: DraftData = JSON.parse(raw)
        setForm(draft.form)
      }
    } catch {
      // ignore
    }
    setShowDraftBanner(false)
  }

  function discardDraft() {
    try {
      localStorage.removeItem(draftKey(editingId))
    } catch {
      // ignore
    }
    setShowDraftBanner(false)
  }

  function addTag(raw: string) {
    const tag = raw.trim()
    if (!tag) return
    const current = tagsArray
    if (current.includes(tag)) {
      setTagInput('')
      return
    }
    const next = [...current, tag].join(', ')
    update('tags', next)
    setTagInput('')
  }

  function removeTag(tag: string) {
    const next = tagsArray.filter((t) => t !== tag).join(', ')
    update('tags', next)
  }

  function handleTagKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addTag(tagInput)
    } else if (e.key === 'Backspace' && !tagInput && tagsArray.length > 0) {
      removeTag(tagsArray[tagsArray.length - 1])
    }
  }

  function autoExcerpt() {
    const text = extractPlainText(form.content)
    const excerpt = text.slice(0, 200) + (text.length > 200 ? '…' : '')
    update('excerpt', excerpt)
  }

  async function handleSubmit(publishedValue: number) {
    if (!form.title.trim() || !form.content.trim()) {
      setError('标题和内容不能为空')
      return
    }
    setSaving(true)
    setError('')
    try {
      const data = { ...form, published: publishedValue }
      if (mode === 'new' && publishedValue === 1 && onPublish) {
        await onPublish(data)
      } else if (mode === 'new' && publishedValue === 0 && onSaveDraft) {
        await onSaveDraft(data)
      } else if (onSubmit) {
        await onSubmit(data)
      }
      try {
        localStorage.removeItem(draftKey(editingId))
      } catch {
        // ignore
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '提交失败')
    } finally {
      setSaving(false)
    }
  }

  const isNewMode = mode === 'new'
  const hasCover = form.cover_image.trim() && !coverPreviewError

  return (
    <form
      className="editor-form"
      onSubmit={(e) => {
        e.preventDefault()
        handleSubmit(1)
      }}
    >
      {/* Draft banner */}
      {showDraftBanner && (
        <div className="editor-form__banner">
          <span>检测到未保存的草稿，是否恢复？</span>
          <div className="editor-form__banner-actions">
            <button type="button" className="editor-form__banner-btn" onClick={restoreDraft}>
              恢复
            </button>
            <button type="button" className="editor-form__banner-btn editor-form__banner-btn--ghost" onClick={discardDraft}>
              丢弃
            </button>
          </div>
        </div>
      )}

      {/* Error */}
      {error && <div className="editor-form__error">{error}</div>}

      {/* Sticky toolbar */}
      <div className="editor-form__toolbar">
        <div className="editor-form__toolbar-left">
          <span className={`editor-form__autosave${savedHintVisible ? ' editor-form__autosave--visible' : ''}`}>
            已自动保存
          </span>
        </div>
        <div className="editor-form__toolbar-right">
          {isNewMode && (
            <button
              type="button"
              className="editor-form__btn editor-form__btn--secondary"
              disabled={saving}
              onClick={() => handleSubmit(0)}
            >
              {saving ? '保存中…' : '保存草稿'}
            </button>
          )}
          <button
            type="button"
            className="editor-form__btn editor-form__btn--primary"
            disabled={saving}
            onClick={() => handleSubmit(isNewMode ? 1 : (form.published ?? 1))}
          >
            {saving ? '保存中…' : isNewMode ? '立即发布' : submitLabel}
          </button>
        </div>
      </div>

      {/* Title */}
      <div className="editor-form__title-wrap">
        <input
          className="editor-form__title-input"
          value={form.title}
          onChange={(e) => update('title', e.target.value)}
          placeholder="给你的文章起个标题…"
          required
        />
      </div>

      {/* Meta row: category + tags */}
      <div className="editor-form__meta">
        <div className="editor-form__meta-item">
          <label className="editor-form__meta-label">分类</label>
          <select
            className="editor-form__meta-select"
            value={form.category}
            onChange={(e) => update('category', e.target.value)}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div className="editor-form__meta-item editor-form__meta-item--grow">
          <label className="editor-form__meta-label">标签</label>
          <div className="tag-input">
            <div className="tag-input__chips">
              {tagsArray.map((tag) => (
                <span key={tag} className="tag-input__chip">
                  {tag}
                  <button type="button" className="tag-input__chip-remove" onClick={() => removeTag(tag)} title="移除">
                    ×
                  </button>
                </span>
              ))}
              <input
                ref={tagInputRef}
                className="tag-input__field"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
                onBlur={() => {
                  if (tagInput.trim()) addTag(tagInput)
                }}
                placeholder={tagsArray.length === 0 ? '输入标签，按回车添加' : ''}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Cover image */}
      <div className="editor-form__section">
        <label className="editor-form__section-label">封面图</label>
        <div className="cover-input">
          <input
            className="cover-input__url"
            value={form.cover_image}
            onChange={(e) => {
              update('cover_image', e.target.value)
              setCoverPreviewError(false)
            }}
            placeholder="https://images.unsplash.com/..."
          />
          {hasCover && (
            <div className="cover-input__preview">
              <img
                src={form.cover_image}
                alt="封面预览"
                onError={() => setCoverPreviewError(true)}
              />
            </div>
          )}
        </div>
      </div>

      {/* Excerpt */}
      <div className="editor-form__section">
        <div className="editor-form__section-header">
          <label className="editor-form__section-label">摘要</label>
          <button type="button" className="editor-form__section-action" onClick={autoExcerpt}>
            从正文生成
          </button>
        </div>
        <textarea
          className="editor-form__textarea editor-form__textarea--small"
          value={form.excerpt}
          onChange={(e) => update('excerpt', e.target.value)}
          placeholder="出现在文章列表里的简短描述（留空将自动截取正文）"
          rows={2}
        />
      </div>

      {/* Content */}
      <div className="editor-form__section">
        <div className="editor-form__section-header">
          <label className="editor-form__section-label">正文</label>
          <span className="editor-form__stats">
            {stats.total > 0 && (
              <>
                {stats.total} 字 · 约 {stats.minutes} 分钟阅读
              </>
            )}
          </span>
        </div>
        <MarkdownEditor
          value={form.content}
          onChange={(v) => update('content', v)}
          placeholder="# 你的故事从这里开始…"
          minHeight={420}
        />
      </div>

      {/* Advanced settings */}
      <div className="editor-form__advanced">
        <button
          type="button"
          className={`editor-form__advanced-toggle${showSettings ? ' editor-form__advanced-toggle--open' : ''}`}
          onClick={() => setShowSettings(!showSettings)}
        >
          <span>高级设置</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        {showSettings && (
          <div className="editor-form__advanced-body">
            {/* Publish status (edit mode only) */}
            {!isNewMode && (
              <div className="editor-form__advanced-row">
                <label className="editor-form__advanced-label">发布状态</label>
                <div className="editor-form__radio-group">
                  <label className="editor-form__radio">
                    <input
                      type="radio"
                      name="published"
                      checked={form.published !== 0}
                      onChange={() => update('published', 1)}
                    />
                    <span>已发布</span>
                  </label>
                  <label className="editor-form__radio">
                    <input
                      type="radio"
                      name="published"
                      checked={form.published === 0}
                      onChange={() => update('published', 0)}
                    />
                    <span>草稿</span>
                  </label>
                </div>
              </div>
            )}

            {/* Custom JS */}
            <div className="editor-form__advanced-row">
              <div className="editor-form__advanced-header">
                <label className="editor-form__advanced-label">自定义脚本</label>
                <span className="editor-form__advanced-hint">
                  为文章页添加自定义效果（背景动画、音乐等）
                </span>
              </div>
              <div className="editor-form__presets">
                <button type="button" className="editor-form__preset" onClick={() => update('custom_js', PRESET_BG_GRADIENT)}>
                  渐变背景
                </button>
                <button type="button" className="editor-form__preset" onClick={() => update('custom_js', PRESET_SNOW)}>
                  飘雪特效
                </button>
                <button type="button" className="editor-form__preset" onClick={() => update('custom_js', PRESET_MUSIC)}>
                  背景音乐
                </button>
                <button type="button" className="editor-form__preset" onClick={() => update('custom_js', PRESET_TYPING)}>
                  打字机效果
                </button>
                <button type="button" className="editor-form__preset editor-form__preset--danger" onClick={() => update('custom_js', '')}>
                  清空
                </button>
              </div>
              <textarea
                className="editor-form__textarea editor-form__textarea--code"
                value={form.custom_js || ''}
                onChange={(e) => update('custom_js', e.target.value)}
                placeholder="// 在这里写 JavaScript 代码…"
                rows={8}
                spellCheck={false}
              />
              <div className="editor-form__code-info">
                <span>仅在文章详情页执行 · 限制 20KB</span>
                <span>{(form.custom_js || '').length} / 20000</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom actions */}
      <div className="editor-form__footer">
        {isNewMode && (
          <button
            type="button"
            className="editor-form__btn editor-form__btn--secondary"
            disabled={saving}
            onClick={() => handleSubmit(0)}
          >
            {saving ? '保存中…' : '保存草稿'}
          </button>
        )}
        <button
          type="button"
          className="editor-form__btn editor-form__btn--primary"
          disabled={saving}
          onClick={() => handleSubmit(isNewMode ? 1 : (form.published ?? 1))}
        >
          {saving ? '保存中…' : isNewMode ? '立即发布' : submitLabel}
        </button>
      </div>
    </form>
  )
}
