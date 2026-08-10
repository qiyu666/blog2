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

  /** Markdown 快捷键处理器 */
  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    const ctrl = e.ctrlKey || e.metaKey
    const shift = e.shiftKey
    const k = e.key.toLowerCase()

    // Ctrl/Cmd + Shift + 字母组合
    if (ctrl && shift && !e.altKey) {
      if (k === 'k') {
        // Ctrl+Shift+K：插入代码块
        e.preventDefault()
        insertCode()
        return
      }
      if (k === 'i') {
        // Ctrl+Shift+I：插入图片
        e.preventDefault()
        insertImage()
        return
      }
      if (k === 'c') {
        // Ctrl+Shift+C：插入代码块（另一种习惯）
        e.preventDefault()
        insertCode()
        return
      }
    }

    // Ctrl/Cmd + 字母（无 Shift/Alt）
    if (ctrl && !e.altKey && !shift) {
      if (k === 'b') {
        e.preventDefault()
        wrapSelection('**', '**', '加粗文字')
        return
      }
      if (k === 'i') {
        e.preventDefault()
        wrapSelection('*', '*', '斜体文字')
        return
      }
      if (k === 'k') {
        e.preventDefault()
        insertLink()
        return
      }
      if (k === 'q') {
        // Ctrl+Q：引用
        e.preventDefault()
        linePrefix('> ')
        return
      }
      if (k === 'u') {
        // Ctrl+U：无序列表
        e.preventDefault()
        linePrefix('- ')
        return
      }
      if (k === 'e') {
        // Ctrl+E：行内代码
        e.preventDefault()
        wrapSelection('`', '`', '代码')
        return
      }
      if (k === 's') {
        // Ctrl+S：不拦截保存（交给父表单），但阻止浏览器默认保存页面
        e.preventDefault()
        // 派发自定义事件，父组件可监听保存草稿
        window.dispatchEvent(new CustomEvent('md-editor:save'))
        return
      }
      if (['1', '2', '3', '4', '5'].includes(k)) {
        // Ctrl+1~5：标题 1~5
        const level = Number(k)
        const prefix = '#'.repeat(level) + ' '
        e.preventDefault()
        linePrefix(prefix)
        return
      }
    }

    // Tab / Shift+Tab 缩进（支持多选行）
    if (e.key === 'Tab') {
      e.preventDefault()
      const ta = e.currentTarget
      const start = ta.selectionStart
      const end = ta.selectionEnd
      const before = value.slice(0, start)
      const selected = value.slice(start, end)
      const after = value.slice(end)
      if (!shift) {
        // 缩进
        if (selected.includes('\n')) {
          // 多行：每行开头加 2 空格
          const indented = selected.split('\n').map(l => '  ' + l).join('\n')
          onChange(before + indented + after)
          requestAnimationFrame(() => {
            ta.selectionStart = start
            ta.selectionEnd = start + indented.length
          })
        } else {
          onChange(before + '  ' + after)
          requestAnimationFrame(() => {
            ta.selectionStart = ta.selectionEnd = start + 2
          })
        }
      } else {
        // Shift+Tab 取消缩进
        if (selected.includes('\n')) {
          const unindented = selected.split('\n').map(l => l.startsWith('  ') ? l.slice(2) : l).join('\n')
          onChange(before + unindented + after)
          requestAnimationFrame(() => {
            ta.selectionStart = start
            ta.selectionEnd = start + unindented.length
          })
        } else {
          // 单行：向前删除最多 2 个空格
          const leadingSpaces = before.match(/( {1,2})$/)
          if (leadingSpaces) {
            const n = leadingSpaces[0].length
            onChange(before.slice(0, -n) + selected + after)
            requestAnimationFrame(() => {
              ta.selectionStart = ta.selectionEnd = start - n
            })
          }
        }
      }
    }
  }

  return (
    <div className="md-editor">
      <div className="md-editor__toolbar">
          <div className="md-editor__group">
            <button type="button" className="md-editor__btn" title="标题一 (Ctrl+1)" onClick={() => linePrefix('# ')}>H1</button>
            <button type="button" className="md-editor__btn" title="标题二 (Ctrl+2)" onClick={() => linePrefix('## ')}>H2</button>
            <button type="button" className="md-editor__btn" title="标题三 (Ctrl+3)" onClick={() => linePrefix('### ')}>H3</button>
            <button type="button" className="md-editor__btn" title="标题四 (Ctrl+4)" onClick={() => linePrefix('#### ')}>H4</button>
            <button type="button" className="md-editor__btn" title="标题五 (Ctrl+5)" onClick={() => linePrefix('##### ')}>H5</button>
          </div>
          <div className="md-editor__group">
            <button type="button" className="md-editor__btn" title="粗体 (Ctrl+B)" onClick={() => wrapSelection('**', '**', '粗体')}><strong>B</strong></button>
            <button type="button" className="md-editor__btn" title="斜体 (Ctrl+I)" onClick={() => wrapSelection('*', '*', '斜体')}><em>I</em></button>
            <button type="button" className="md-editor__btn" title="行内代码 (Ctrl+E)" onClick={() => wrapSelection('`', '`', '代码')}><code>{'</>'}</code></button>
          </div>
          <div className="md-editor__group">
            <button type="button" className="md-editor__btn" title="无序列表 (Ctrl+U)" onClick={() => linePrefix('- ')}>列表</button>
            <button type="button" className="md-editor__btn" title="引用 (Ctrl+Q)" onClick={() => linePrefix('> ')}>引用</button>
            <button type="button" className="md-editor__btn" title="链接 (Ctrl+K)" onClick={insertLink}>链接</button>
            <button type="button" className="md-editor__btn" title="图片 (Ctrl+Shift+I)" onClick={insertImage}>🖼 图片</button>
            <button type="button" className="md-editor__btn" title="代码块 (Ctrl+Shift+K)" onClick={insertCode}>{'{ }'}</button>
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
        stash(`<img src="${url}" alt="${alt}" loading="lazy" style="max-width:100%;border-radius:8px;" />`),
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
