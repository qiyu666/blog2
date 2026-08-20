import DOMPurify from 'dompurify'
import Prism from 'prismjs'
import 'prismjs/components/prism-javascript'
import 'prismjs/components/prism-typescript'
import 'prismjs/components/prism-python'
import 'prismjs/components/prism-bash'
import 'prismjs/components/prism-css'
import 'prismjs/components/prism-json'
import 'prismjs/components/prism-sql'
import 'prismjs/components/prism-markup'
import 'prismjs/components/prism-java'
import 'prismjs/components/prism-c'
import 'prismjs/components/prism-cpp'
import 'prismjs/components/prism-go'
import 'prismjs/components/prism-rust'
import 'prismjs/components/prism-yaml'
import 'prismjs/components/prism-markdown'
import 'prismjs/components/prism-swift'
import 'prismjs/components/prism-kotlin'
import 'prismjs/components/prism-ruby'
import 'prismjs/components/prism-php'
import 'prismjs/components/prism-csharp'
import 'prismjs/components/prism-shell-session'
import 'prismjs/components/prism-diff'
import katex from 'katex'

type RenderOptions = {
  allowMath?: boolean
  mentions?: boolean
  skipCodeHighlight?: boolean
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function processInlineMath(text: string, opts?: RenderOptions): string {
  if (!opts?.allowMath) return text
  return text.replace(/\$([^$\n]+)\$/g, (_, math: string) => {
    try {
      return katex.renderToString(math.trim(), { throwOnError: false, displayMode: false })
    } catch {
      return `<span class="math-inline error">${escapeHtml(math)}</span>`
    }
  })
}

function processInlineMarkdown(text: string, opts?: RenderOptions): string {
  // 1. 行内代码 `code`（优先处理，避免与其他标记冲突）
  text = text.replace(/`([^`\n]+)`/g, (_, code: string) => {
    return `<code>${escapeHtml(code)}</code>`
  })
  // 2. 链接 [text](url)
  text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, href) => {
    const safeHref = href.replace(/"/g, '&quot;')
    return `<a href="${safeHref}" target="_blank" rel="noopener noreferrer">${label}</a>`
  })
  // 3. 加粗 **text** 或 __text__
  text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  text = text.replace(/__(.+?)__/g, '<strong>$1</strong>')
  // 4. 斜体 *text* 或 _text_
  text = text.replace(/\*(.+?)\*/g, '<em>$1</em>')
  text = text.replace(/_(.+?)_/g, '<em>$1</em>')
  // 5. 删除线 ~~text~~
  text = text.replace(/~~(.+?)~~/g, '<del>$1</del>')
  return processInlineMath(text, opts)
}

function processBlockMath(lines: string[]): string[] {
  const result: string[] = []
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    if (line.trimStart().startsWith('$$') && line.trimEnd().endsWith('$$')) {
      const math = line.slice(2, -2).trim()
      try {
        result.push(`<div class="math-block">${katex.renderToString(math, { throwOnError: false, displayMode: true })}</div>`)
      } catch {
        result.push(`<div class="math-block error">${escapeHtml(math)}</div>`)
      }
      i++
    } else if (line.startsWith('$$')) {
      const blocks: string[] = [line.slice(2)]
      i++
      while (i < lines.length && !lines[i].trimEnd().endsWith('$$')) {
        blocks.push(lines[i])
        i++
      }
      if (i < lines.length) {
        const lastLine = lines[i].trimEnd()
        if (lastLine.endsWith('$$')) {
          blocks.push(lastLine.slice(0, -2))
          i++
        }
      }
      const math = blocks.join('\n').trim()
      try {
        result.push(`<div class="math-block">${katex.renderToString(math, { throwOnError: false, displayMode: true })}</div>`)
      } catch {
        result.push(`<div class="math-block error">${escapeHtml(math)}</div>`)
      }
    } else {
      result.push(line)
      i++
    }
  }
  return result
}

function buildCodeBlockHTML(code: string, lang: string, opts?: RenderOptions): string {
  let highlighted = code
  if (!opts?.skipCodeHighlight && lang && Prism.languages[lang]) {
    highlighted = Prism.highlight(code, Prism.languages[lang], lang)
  }
  const langLabel = lang || 'text'
  return `<pre class="code-block"><div class="code-block__header"><span class="code-block__lang">${escapeHtml(langLabel)}</span><button class="code-block__copy" onclick="navigator.clipboard.writeText(this.closest('.code-block').querySelector('code').textContent)">复制</button></div><code class="language-${escapeHtml(lang)}">${highlighted}</code></pre>`
}

function renderMarkdownRaw(text: string, opts?: RenderOptions): string {
  if (!text) return ''
  const lines = text.split('\n')
  const processed = opts?.allowMath ? processBlockMath(lines) : lines

  // Phase 1: 提取代码块，将内容替换为占位符（允许最多 3 格缩进）
  const placeholders: string[] = []
  let idx = 0
  const tokens: string[] = []
  let inCodeBlock = false
  let codeBuffer = ''
  let codeLang = ''
  const fenceRE = /^[ \t]*```/

  for (let i = 0; i < processed.length; i++) {
    const line = processed[i]
    const fenceMatch = line.match(fenceRE)
    if (!inCodeBlock && fenceMatch) {
      inCodeBlock = true
      codeLang = line.slice(fenceMatch[0].length).trim()
      codeBuffer = ''
      continue
    }
    if (inCodeBlock) {
      if (fenceMatch && codeBuffer !== '') {
        inCodeBlock = false
        const placeholder = `%%PLACEHOLDER_${idx}%%`
        placeholders[idx++] = buildCodeBlockHTML(codeBuffer, codeLang, opts)
        tokens.push(placeholder)
        codeBuffer = ''
        codeLang = ''
        continue
      }
      codeBuffer += (codeBuffer ? '\n' : '') + line
    } else {
      tokens.push(line)
    }
  }
  // 处理末尾未闭合的代码块
  if (inCodeBlock && codeBuffer !== '') {
    const placeholder = `%%PLACEHOLDER_${idx}%%`
    placeholders[idx++] = buildCodeBlockHTML(codeBuffer, codeLang, opts)
    tokens.push(placeholder)
  }

  // Phase 2: 对非代码行做行内格式化
  let html = ''
  let tIdx = 0
  while (tIdx < tokens.length) {
    const token = tokens[tIdx]
    if (token.startsWith('%%PLACEHOLDER_')) {
      html += token
      tIdx++
      continue
    }
    if (token.match(/^#{1,5}\s/)) {
      const match = token.match(/^(#{1,5})\s+(.+)$/)
      if (match) {
        const level = match[1].length
        const title = processInlineMarkdown(match[2], opts)
        const slug = title.replace(/[^\u4e00-\u9fa5a-zA-Z0-9\u00C0-\u024F]/g, '-').toLowerCase().replace(/-+/g, '-').slice(0, 80) || 'heading'
        html += `<h${level} id="${slug}">${title}</h${level}>`
        tIdx++
        continue
      }
    }
    if (token.startsWith('- ') || token.startsWith('* ')) {
      const items: string[] = []
      while (tIdx < tokens.length && (tokens[tIdx].startsWith('- ') || tokens[tIdx].startsWith('* '))) {
        const line = tokens[tIdx++]
        if (!line.match(/^%%PLACEHOLDER_/)) items.push(processInlineMarkdown(line.slice(2).trim(), opts))
      }
      html += '<ul>' + items.map((item) => `<li>${item}</li>`).join('') + '</ul>'
      continue
    }
    if (token.match(/^\d+\.\s/)) {
      const items: string[] = []
      while (tIdx < tokens.length && tokens[tIdx].match(/^\d+\.\s/)) {
        const line = tokens[tIdx++]
        if (!line.match(/^%%PLACEHOLDER_/)) items.push(processInlineMarkdown(line.replace(/^\d+\.\s/, ''), opts))
      }
      html += '<ol>' + items.map((item) => `<li>${item}</li>`).join('') + '</ol>'
      continue
    }
    if (token.startsWith('> ')) {
      const quoteLines: string[] = []
      while (tIdx < tokens.length && tokens[tIdx].startsWith('> ')) {
        const line = tokens[tIdx++]
        if (!line.match(/^%%PLACEHOLDER_/)) quoteLines.push(processInlineMarkdown(line.slice(2), opts))
      }
      html += `<blockquote>${quoteLines.join('<br>')}</blockquote>`
      continue
    }
    if (token === '---' || token === '***') {
      html += '<hr>'
      tIdx++
      continue
    }
    if (token.startsWith('---[')) {
      const m = token.match(/^---\[(.+?)\]\((.+?)\)/)
      if (m) {
        html += `<div class="divider"><span>${escapeHtml(m[1])}</span></div>`
        tIdx++
        continue
      }
    }
    if (token.trim()) {
      html += `<p>${processInlineMarkdown(token, opts)}</p>`
    } else {
      html += '<br>'
    }
    tIdx++
  }

  // Phase 3: 恢复占位符
  for (let i = 0; i < placeholders.length; i++) {
    html = html.replace(`%%PLACEHOLDER_${i}%%`, placeholders[i])
  }

  return html
}

export function renderMarkdown(text: string, opts?: RenderOptions): string {
  const rawHtml = renderMarkdownRaw(text, opts)
  const inlineProcessed = processInlineMarkdown(rawHtml, { ...opts })
  return DOMPurify.sanitize(inlineProcessed, { ALLOWED_TAGS: ['h1','h2','h3','h4','h5','h6','strong','em','del','u','sub','sup','a','p','br','ul','ol','li','blockquote','hr','pre','code','img','table','thead','tbody','tr','th','td','span','div','section','aside','details','summary','kbd'], ALLOWED_ATTR: ['href','src','alt','class','id','title','target','rel','style','data-lang','data-theme','width','height','checked','disabled','readonly','name','value','pattern','placeholder','min','max','step','multiple','required','open','colspan','rowspan','for','tabindex','spellcheck','translate','draggable','contenteditable','inputmode','autocapitalize','autocomplete','autofocus','maxlength','size','sandbox','frameborder','allowfullscreen','loading','decoding','fetchpriority','ping','sizes','srcset','usemap','start','reversed','type'] })
}

export function applyKaTeX(container: HTMLElement): void {
  const mathBlocks = container.querySelectorAll<HTMLElement>('.math-block')
  mathBlocks.forEach((block) => {
    const raw = block.textContent || ''
    if (raw.trim()) {
      try {
        block.innerHTML = katex.renderToString(raw.trim(), { throwOnError: false, displayMode: true })
      } catch {
        block.classList.add('error')
      }
    }
  })
  const mathInlines = container.querySelectorAll<HTMLElement>('.math-inline')
  mathInlines.forEach((span) => {
    const raw = span.textContent || ''
    if (raw.trim()) {
      try {
        span.innerHTML = katex.renderToString(raw.trim(), { throwOnError: false, displayMode: false })
      } catch {
        span.classList.add('error')
      }
    }
  })
}

export function applyPrism(container: HTMLElement): void {
  container.querySelectorAll<HTMLPreElement>('pre.code-block code').forEach((el) => {
    const lang = el.className.replace('language-', '')
    if (lang && Prism.languages[lang]) {
      el.innerHTML = Prism.highlight(el.textContent || '', Prism.languages[lang], lang)
    }
  })
}

export const POST_TEMPLATES = {
  none: { label: '空白模板', description: '从零开始写作' },
  tutorial: {
    label: '教程类',
    description: '适合步骤教程，包含前置知识、步骤详解和总结',
    frontmatter: { category: '教程' },
    content: `# 标题

## 前置知识

> 简要说明阅读本文需要了解的基础知识

## 步骤一：第一步

详细说明...

## 步骤二：第二步

详细说明...

## 总结

简短总结本文要点。`,
  },
  essay: {
    label: '随笔类',
    description: '适合个人思考、感悟类文章',
    frontmatter: { category: '随笔' },
    content: `# 标题

写开头，引入主题。

正文部分可以自由发挥，记录思考和感悟。

最后以一段总结或展望结尾。`,
  },
  review: {
    label: '技术评测',
    description: '适合工具、库、框架的对比评测',
    frontmatter: { category: '评测' },
    content: `# 标题

## 背景

为什么需要这个评测？解决了什么问题？

## 方案 A

分析内容...

## 方案 B

分析内容...

## 对比总结

| 特性 | A | B |
|------|---|---|
| 性能 |   |   |
| 易用性 |   |   |

## 结论

你的推荐和理由。`,
  },
  changelog: {
    label: '更新日志',
    description: '适合发布版本更新记录',
    frontmatter: { category: '公告' },
    content: `# 标题 v版本号

## 新增

- 功能点1
- 功能点2

## 优化

- 优化内容1

## 修复

- 修复内容1`,
  },
  announcement: {
    label: '公告通知',
    description: '适合网站公告、活动通知等正式内容',
    frontmatter: { category: '公告' },
    content: `# 标题

正文内容，可以使用列表突出重点。

- 要点一
- 要点二
- 要点三

如有疑问，请在评论区反馈。`,
  },
} as const

export type PostTemplateKey = keyof typeof POST_TEMPLATES

/** 代码块语言标识 → 中文展示名 */
export const LANG_LABELS: Record<string, string> = {
  javascript: 'JavaScript',
  js: 'JavaScript',
  typescript: 'TypeScript',
  ts: 'TypeScript',
  python: 'Python',
  py: 'Python',
  bash: 'Bash',
  sh: 'Shell',
  shell: 'Shell',
  css: 'CSS',
  json: 'JSON',
  sql: 'SQL',
  html: 'HTML',
  markup: 'HTML',
  java: 'Java',
  c: 'C',
  cpp: 'C++',
  'c++': 'C++',
  go: 'Go',
  rust: 'Rust',
  rs: 'Rust',
  yaml: 'YAML',
  yml: 'YAML',
  markdown: 'Markdown',
  md: 'Markdown',
  text: '纯文本',
  '': '代码',
}

export function langLabel(lang: string): string {
  const key = (lang || '').toLowerCase().trim()
  return LANG_LABELS[key] || (key ? key.toUpperCase().slice(0, 1) + key.slice(1) : '代码')
}
