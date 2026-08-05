import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import type { PostInput } from '../types'
import { getCategories, type PublicCategory } from '../api'
import { buildCursorStyle } from '../pages/PostDetail'
import MarkdownEditor from './MarkdownEditor'
import CoverUploader from './CoverUploader'

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

const FALLBACK_CATEGORIES = ['随笔', '技术', '文化', '摄影', '综合']

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

/** 简单 YAML 行解析：支持 "key: value" 与 "key: [a, b]" / "key: \"a\"" */
function parseYamlLine(line: string): { key: string; value: string } | null {
  const match = line.match(/^([A-Za-z_][\w-]*)\s*:\s*(.*)$/)
  if (!match) return null
  const key = match[1].trim()
  let value = match[2].trim()
  // 数组形式 [a, b, c]
  if (value.startsWith('[') && value.endsWith(']')) {
    value = value.slice(1, -1)
  }
  // 去除首尾引号
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    value = value.slice(1, -1)
  }
  return { key, value }
}

interface ParsedMarkdown {
  title?: string
  category?: string
  tags?: string
  excerpt?: string
  content: string
}

/** 解析导入的 Markdown：识别 frontmatter 或首个 H1 */
function parseImportedMarkdown(raw: string): ParsedMarkdown {
  const text = raw.replace(/\r\n/g, '\n')
  const result: ParsedMarkdown = { content: '' }

  // Frontmatter: 文件以 --- 开始
  if (text.startsWith('---')) {
    const endMatch = text.indexOf('\n---', 3)
    if (endMatch !== -1) {
      const yamlBlock = text.slice(3, endMatch).trim()
      // body 跳过结束的 --- 行
      let body = text.slice(endMatch + 4)
      if (body.startsWith('\n')) body = body.slice(1)
      result.content = body.trimStart()

      const lines = yamlBlock.split('\n')
      for (const line of lines) {
        const parsed = parseYamlLine(line)
        if (!parsed) continue
        const { key, value } = parsed
        const lower = key.toLowerCase()
        if (lower === 'title') result.title = value
        else if (lower === 'category' || lower === 'categories') result.category = value
        else if (lower === 'tags' || lower === 'tag') result.tags = value
        else if (lower === 'excerpt' || lower === 'description') result.excerpt = value
      }
      return result
    }
  }

  // 无 frontmatter：尝试用首个 H1 作为标题
  const lines = text.split('\n')
  let title: string | undefined
  let bodyStart = 0
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const h1 = line.match(/^#\s+(.+?)\s*$/)
    if (h1) {
      title = h1[1].trim()
      bodyStart = i + 1
      break
    }
    // 遇到非空非 H1 行则停止寻找
    if (line.trim() !== '') break
  }
  if (title) {
    result.title = title
    result.content = lines.slice(bodyStart).join('\n').trimStart()
  } else {
    result.content = text
  }
  return result
}

/** 生成导出用的 Markdown 文本 */
function buildExportMarkdown(form: PostInput): string {
  const tags = (form.tags || '')
    .split(/[,，]/)
    .map((t) => t.trim())
    .filter(Boolean)
    .map((t) => `"${t.replace(/"/g, '\\"')}"`)
    .join(', ')
  const escape = (s: string) => `"${(s || '').replace(/"/g, '\\"')}"`
  const fm: string[] = ['---']
  fm.push(`title: ${escape(form.title || '')}`)
  fm.push(`category: ${escape(form.category || '')}`)
  fm.push(`tags: [${tags}]`)
  fm.push(`excerpt: ${escape(form.excerpt || '')}`)
  fm.push('---')
  return fm.join('\n') + '\n\n' + (form.content || '').trim() + '\n'
}

/** 触发浏览器下载 */
function triggerDownload(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
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
    custom_cursor: initial?.custom_cursor ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [showDraftBanner, setShowDraftBanner] = useState(false)
  const [savedHintVisible, setSavedHintVisible] = useState(false)
  const [tagInput, setTagInput] = useState('')
  const [showSettings, setShowSettings] = useState(false)
  const [categories, setCategories] = useState<PublicCategory[]>([])

  // 加载分类列表
  useEffect(() => {
    getCategories()
      .then((data) => {
        if (data && data.length > 0) {
          setCategories(data)
        }
      })
      .catch(() => {
        // 静默失败，使用回退列表
      })
  }, [])

  // 确保当前分类在选项列表中（编辑模式下可能有历史分类）
  const displayCategories = useMemo(() => {
    if (categories.length === 0) return []
    const names = new Set(categories.map((c) => c.name))
    if (form.category && !names.has(form.category)) {
      return [...categories, { id: 0, name: form.category, slug: '', icon: '📂', count: 0 }]
    }
    return categories
  }, [categories, form.category])

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const savedHintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mountedRef = useRef(false)
  const tagInputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

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

  function handleExportMarkdown() {
    const filename = `${(form.title || 'untitled').replace(/[\\/:*?"<>|]/g, '_').trim() || 'untitled'}.md`
    const md = buildExportMarkdown(form)
    triggerDownload(filename, md)
  }

  function handleImportClick() {
    fileInputRef.current?.click()
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    // 重置 value 以便再次选择同一文件
    e.target.value = ''
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const raw = typeof reader.result === 'string' ? reader.result : ''
      const parsed = parseImportedMarkdown(raw)
      setForm((prev) => ({
        ...prev,
        title: parsed.title ?? prev.title,
        category: parsed.category ?? prev.category,
        tags: parsed.tags ?? prev.tags,
        excerpt: parsed.excerpt ?? prev.excerpt,
        content: parsed.content || prev.content,
      }))
    }
    reader.readAsText(file, 'utf-8')
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
          <button
            type="button"
            className="editor-form__md-btn"
            onClick={handleImportClick}
            title="从 Markdown 文件导入"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            导入 Markdown
          </button>
          <button
            type="button"
            className="editor-form__md-btn"
            onClick={handleExportMarkdown}
            title="导出为 Markdown 文件"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            导出 Markdown
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".md,.markdown,text/markdown"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
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
            {displayCategories.length > 0
              ? displayCategories.map((c) => (
                  <option key={c.id || c.name} value={c.name}>
                    {c.icon} {c.name}
                  </option>
                ))
              : FALLBACK_CATEGORIES.map((c) => (
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
        <CoverUploader
          value={form.cover_image}
          onChange={(url) => update('cover_image', url)}
        />
        <div className="cover-input__url-row">
          <input
            className="cover-input__url"
            value={form.cover_image}
            onChange={(e) => update('cover_image', e.target.value)}
            placeholder="或直接粘贴图片 URL"
          />
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

            {/* 自定义鼠标光标 */}
            <div className="editor-form__advanced-row">
              <div className="editor-form__advanced-header">
                <label className="editor-form__advanced-label">自定义鼠标光标</label>
                <span className="editor-form__advanced-hint">
                  为文章设置个性化光标样式，读者阅读时生效
                </span>
              </div>
              <div className="editor-form__cursor-presets">
                <button
                  type="button"
                  className={`editor-form__cursor-preset${!form.custom_cursor ? ' editor-form__cursor-preset--active' : ''}`}
                  onClick={() => update('custom_cursor', '')}
                >
                  <span className="cursor-preview" style={{ cursor: 'default' }}>Aa</span>
                  <span>默认</span>
                </button>
                <button
                  type="button"
                  className={`editor-form__cursor-preset${form.custom_cursor === 'pointer' ? ' editor-form__cursor-preset--active' : ''}`}
                  onClick={() => update('custom_cursor', 'pointer')}
                >
                  <span className="cursor-preview" style={{ cursor: 'pointer' }}>Aa</span>
                  <span>手形</span>
                </button>
                <button
                  type="button"
                  className={`editor-form__cursor-preset${form.custom_cursor === 'crosshair' ? ' editor-form__cursor-preset--active' : ''}`}
                  onClick={() => update('custom_cursor', 'crosshair')}
                >
                  <span className="cursor-preview" style={{ cursor: 'crosshair' }}>Aa</span>
                  <span>十字</span>
                </button>
                <button
                  type="button"
                  className={`editor-form__cursor-preset${form.custom_cursor === 'text' ? ' editor-form__cursor-preset--active' : ''}`}
                  onClick={() => update('custom_cursor', 'text')}
                >
                  <span className="cursor-preview" style={{ cursor: 'text' }}>Aa</span>
                  <span>文本</span>
                </button>
                <button
                  type="button"
                  className={`editor-form__cursor-preset${form.custom_cursor === 'help' ? ' editor-form__cursor-preset--active' : ''}`}
                  onClick={() => update('custom_cursor', 'help')}
                >
                  <span className="cursor-preview" style={{ cursor: 'help' }}>Aa</span>
                  <span>帮助</span>
                </button>
                <button
                  type="button"
                  className={`editor-form__cursor-preset${form.custom_cursor === 'grab' ? ' editor-form__cursor-preset--active' : ''}`}
                  onClick={() => update('custom_cursor', 'grab')}
                >
                  <span className="cursor-preview" style={{ cursor: 'grab' }}>Aa</span>
                  <span>抓取</span>
                </button>
                <button
                  type="button"
                  className={`editor-form__cursor-preset${form.custom_cursor === 'wait' ? ' editor-form__cursor-preset--active' : ''}`}
                  onClick={() => update('custom_cursor', 'wait')}
                >
                  <span className="cursor-preview" style={{ cursor: 'wait' }}>Aa</span>
                  <span>等待</span>
                </button>
                <button
                  type="button"
                  className={`editor-form__cursor-preset${form.custom_cursor === 'copy' ? ' editor-form__cursor-preset--active' : ''}`}
                  onClick={() => update('custom_cursor', 'copy')}
                >
                  <span className="cursor-preview" style={{ cursor: 'copy' }}>Aa</span>
                  <span>复制</span>
                </button>
              </div>
              <div className="editor-form__cursor-custom">
                <input
                  type="text"
                  className="editor-form__input"
                  value={(() => {
                    const v = form.custom_cursor || ''
                    // 预设值不在输入框显示
                    const presets = ['default','pointer','crosshair','text','help','grab','wait','copy']
                    if (presets.includes(v)) return ''
                    // 去掉 url(...) 包裹，显示原始 URL
                    if (v.startsWith('url("') && v.endsWith('"), auto')) return v.slice(5, -8)
                    if (v.startsWith('url(') && v.endsWith('), auto')) return v.slice(4, -7)
                    return v
                  })()}
                  onChange={(e) => {
                    update('custom_cursor', e.target.value.trim())
                  }}
                  placeholder="粘贴光标图片 URL（.cur / .png / .svg，建议 32x32）"
                />
                {form.custom_cursor && !['default','pointer','crosshair','text','help','grab','wait','copy'].includes(form.custom_cursor) && (
                  <div className="editor-form__cursor-preview-box">
                    <span style={{ cursor: buildCursorStyle(form.custom_cursor) }}>预览效果</span>
                    <span className="editor-form__cursor-hint">将鼠标移到上方文字测试光标 · 图片建议不超过 128x128</span>
                  </div>
                )}
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
