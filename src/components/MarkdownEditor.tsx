import { useState, useRef, useMemo } from 'react'
import DOMPurify from 'dompurify'

interface Props {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  minHeight?: number
}

/**
 * 轻量 Markdown 编辑器：工具栏 + 实时预览
 * 不引入第三方依赖，复用 PostDetail 里的渲染逻辑
 */
export default function MarkdownEditor({
  value,
  onChange,
  placeholder = '# 在这里开始写作…',
  minHeight = 360,
}: Props) {
  const [mode, setMode] = useState<'write' | 'preview'>('write')
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  const html = useMemo(() => renderMarkdown(value), [value])

  /** 在当前光标位置插入/包裹文本 */
  function wrapSelection(prefix: string, suffix: string = prefix, placeholder = '') {
    const ta = textareaRef.current
    if (!ta) return
    const start = ta.selectionStart
    const end = ta.selectionEnd
    const selected = value.slice(start, end) || placeholder
    const before = value.slice(0, start)
    const after = value.slice(end)
    const newText = before + prefix + selected + suffix + after
    onChange(newText)
    // 还原光标到包裹内容中间
    requestAnimationFrame(() => {
      ta.focus()
      ta.selectionStart = start + prefix.length
      ta.selectionEnd = start + prefix.length + selected.length
    })
  }

  /** 在行首插入前缀（如 #、-、>） */
  function linePrefix(prefix: string) {
    const ta = textareaRef.current
    if (!ta) return
    const start = ta.selectionStart
    const lineStart = value.lastIndexOf('\n', start - 1) + 1
    const before = value.slice(0, lineStart)
    const after = value.slice(lineStart)
    onChange(before + prefix + after)
    requestAnimationFrame(() => {
      ta.focus()
      ta.selectionStart = ta.selectionEnd = start + prefix.length
    })
  }

  function insertLink() {
    const ta = textareaRef.current
    if (!ta) return
    const start = ta.selectionStart
    const end = ta.selectionEnd
    const selected = value.slice(start, end) || '链接文字'
    const before = value.slice(0, start)
    const after = value.slice(end)
    // 格式：[选中文字](https://)
    const urlPlaceholder = 'https://'
    const inserted = `[${selected}](${urlPlaceholder})`
    onChange(before + inserted + after)
    requestAnimationFrame(() => {
      ta.focus()
      // https:// 的起始位置：`[` + 选中文字 + `](` → 长度 = 1 + selected.length + 2
      const urlStart = start + 1 + selected.length + 2
      ta.selectionStart = urlStart
      ta.selectionEnd = urlStart + urlPlaceholder.length
    })
  }

  function insertImage() {
    const ta = textareaRef.current
    if (!ta) return
    const start = ta.selectionStart
    const end = ta.selectionEnd
    const selected = value.slice(start, end) || '图片描述'
    const before = value.slice(0, start)
    const after = value.slice(end)
    const urlPlaceholder = 'https://'
    const inserted = `![${selected}](${urlPlaceholder})`
    onChange(before + inserted + after)
    requestAnimationFrame(() => {
      ta.focus()
      // 选中 URL 部分：`![` + 描述 + `](` → 长度 = 2 + selected.length + 2
      const urlStart = start + 2 + selected.length + 2
      ta.selectionStart = urlStart
      ta.selectionEnd = urlStart + urlPlaceholder.length
    })
  }

  function insertCode() {
    const ta = textareaRef.current
    if (!ta) return
    const start = ta.selectionStart
    const end = ta.selectionEnd
    const selected = value.slice(start, end)
    // 多行 → 代码块；单行 → 行内代码
    if (selected.includes('\n') || selected.length > 30) {
      const before = value.slice(0, start)
      const after = value.slice(end)
      onChange(before + '\n```\n' + selected + '\n```\n' + after)
    } else {
      wrapSelection('`', '`', '代码')
    }
  }

  /** Tab 缩进 */
  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Tab') {
      e.preventDefault()
      const ta = e.currentTarget
      const start = ta.selectionStart
      const end = ta.selectionEnd
      const before = value.slice(0, start)
      const after = value.slice(end)
      onChange(before + '  ' + after)
      requestAnimationFrame(() => {
        ta.selectionStart = ta.selectionEnd = start + 2
      })
    }
  }

  return (
    <div className="md-editor">
      <div className="md-editor__toolbar">
          <div className="md-editor__group">
            <button type="button" className="md-editor__btn" title="标题一" onClick={() => linePrefix('# ')}>H1</button>
            <button type="button" className="md-editor__btn" title="标题二" onClick={() => linePrefix('## ')}>H2</button>
            <button type="button" className="md-editor__btn" title="标题三" onClick={() => linePrefix('### ')}>H3</button>
            <button type="button" className="md-editor__btn" title="标题四" onClick={() => linePrefix('#### ')}>H4</button>
            <button type="button" className="md-editor__btn" title="标题五" onClick={() => linePrefix('##### ')}>H5</button>
          </div>
          <div className="md-editor__group">
            <button type="button" className="md-editor__btn" title="粗体" onClick={() => wrapSelection('**', '**', '粗体')}><strong>B</strong></button>
            <button type="button" className="md-editor__btn" title="斜体" onClick={() => wrapSelection('*', '*', '斜体')}><em>I</em></button>
            <button type="button" className="md-editor__btn" title="行内代码" onClick={insertCode}><code>{'</>'}</code></button>
          </div>
          <div className="md-editor__group">
            <button type="button" className="md-editor__btn" title="无序列表" onClick={() => linePrefix('- ')}>列表</button>
            <button type="button" className="md-editor__btn" title="引用" onClick={() => linePrefix('> ')}>引用</button>
            <button type="button" className="md-editor__btn" title="链接" onClick={insertLink}>链接</button>
            <button type="button" className="md-editor__btn" title="图片" onClick={insertImage}>🖼 图片</button>
          </div>
          <div className="md-editor__tabs">
            <button
              type="button"
              className={`md-editor__tab ${mode === 'write' ? 'md-editor__tab--active' : ''}`}
              onClick={() => setMode('write')}
            >
              编辑
            </button>
            <button
              type="button"
              className={`md-editor__tab ${mode === 'preview' ? 'md-editor__tab--active' : ''}`}
              onClick={() => setMode('preview')}
            >
              预览
            </button>
          </div>
        </div>

      {mode === 'write' ? (
        <textarea
          ref={textareaRef}
          className="form__textarea md-editor__textarea"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          style={{ minHeight }}
          spellCheck={false}
        />
      ) : (
        <div
          className="md-editor__preview article__body"
          style={{ minHeight }}
          dangerouslySetInnerHTML={{ __html: html || '<p style="color:var(--text-soft)">还没有内容</p>' }}
        />
      )}
    </div>
  )
}

// ---- Markdown 渲染（与 PostDetail 保持一致） ----
function renderMarkdown(md: string): string {
  const lines = md.split('\n')
  let html = ''
  let inList = false
  let inCode = false
  let codeBuffer: string[] = []

  function inline(text: string): string {
    // 第 1 步：先提取 Markdown 链接和图片（避免 &< > 转义破坏 URL）
    const placeholders: string[] = []
    const stash = (html: string) => {
      placeholders.push(html)
      return `\x00PLACEHOLDER_${placeholders.length - 1}\x00`
    }
    let processed = text
      // ![alt](url)
      .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_, alt, url) =>
        stash(`<img src="${url}" alt="${alt}" style="max-width:100%;border-radius:8px;" />`),
      )
      // [text](url)
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, url) =>
        stash(`<a href="${url}" target="_blank" rel="noreferrer noopener">${label}</a>`),
      )
    // 第 2 步：转义剩余的 HTML 特殊字符
    processed = processed
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    // 第 3 步：还原占位符
    processed = processed.replace(
      /\x00PLACEHOLDER_(\d+)\x00/g,
      (_, i) => placeholders[Number(i)] ?? '',
    )
    return processed
  }

  for (const line of lines) {
    if (line.trim().startsWith('```')) {
      if (inCode) {
        html += `<pre><code>${codeBuffer.join('\n').replace(/</g, '&lt;')}</code></pre>\n`
        codeBuffer = []
        inCode = false
      } else {
        if (inList) { html += '</ul>\n'; inList = false }
        inCode = true
      }
      continue
    }
    if (inCode) {
      codeBuffer.push(line)
      continue
    }
    if (/^###\s/.test(line)) {
      if (inList) { html += '</ul>\n'; inList = false }
      html += `<h3>${inline(line.replace(/^###\s/, ''))}</h3>\n`
    } else if (/^##\s/.test(line)) {
      if (inList) { html += '</ul>\n'; inList = false }
      html += `<h2>${inline(line.replace(/^##\s/, ''))}</h2>\n`
    } else if (/^#\s/.test(line)) {
      if (inList) { html += '</ul>\n'; inList = false }
      html += `<h1>${inline(line.replace(/^#\s/, ''))}</h1>\n`
    } else if (/^>\s/.test(line)) {
      if (inList) { html += '</ul>\n'; inList = false }
      html += `<blockquote>${inline(line.replace(/^>\s/, ''))}</blockquote>\n`
    } else if (/^[-*]\s/.test(line)) {
      if (!inList) { html += '<ul>\n'; inList = true }
      html += `<li>${inline(line.replace(/^[-*]\s/, ''))}</li>\n`
    } else if (line.trim() === '') {
      if (inList) { html += '</ul>\n'; inList = false }
    } else {
      if (inList) { html += '</ul>\n'; inList = false }
      html += `<p>${inline(line)}</p>\n`
    }
  }
  if (inList) html += '</ul>\n'
  if (inCode) html += `<pre><code>${codeBuffer.join('\n').replace(/</g, '&lt;')}</code></pre>\n`
  // 用 DOMPurify 过滤 XSS
  return DOMPurify.sanitize(html, { ADD_ATTR: ['target', 'rel'] })
}
