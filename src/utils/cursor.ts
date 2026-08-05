const PRESET_CURSORS = new Set([
  'default', 'pointer', 'crosshair', 'text', 'help',
  'grab', 'grabbing', 'wait', 'progress', 'copy',
  'not-allowed', 'no-drop', 'move', 'cell', 'alias',
  'zoom-in', 'zoom-out', 'col-resize', 'row-resize',
  'n-resize', 's-resize', 'e-resize', 'w-resize',
])

const CURSOR_NAMES: Record<string, string> = {
  default: '默认',
  pointer: '手形',
  crosshair: '十字',
  text: '文本',
  help: '帮助',
  grab: '抓取',
  grabbing: '按住',
  wait: '等待',
  progress: '进度',
  copy: '复制',
  'not-allowed': '禁止',
  move: '移动',
  cell: '单元格',
  alias: '别名',
  'zoom-in': '放大',
  'zoom-out': '缩小',
}

export function getCursorLabel(value: string): string {
  return CURSOR_NAMES[value] || value
}

export function buildCursorStyle(value: string | undefined | null): string {
  if (!value) return 'default'
  const v = value.trim()
  if (!v) return 'default'
  if (PRESET_CURSORS.has(v)) return v
  if (v.startsWith('url(')) return v
  return `url("${v}") 16 16, auto`
}

export function isPresetCursor(value: string | undefined | null): boolean {
  if (!value) return false
  return PRESET_CURSORS.has(value.trim())
}

export function isUrlCursor(value: string | undefined | null): boolean {
  if (!value) return false
  const v = value.trim()
  if (!v) return false
  if (PRESET_CURSORS.has(v)) return false
  return v.startsWith('url(') || v.startsWith('http') || v.endsWith('.cur') || v.endsWith('.png') || v.endsWith('.svg') || v.endsWith('.ico')
}
