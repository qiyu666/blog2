import { useEffect, useRef } from 'react'

interface Props {
  open: boolean
  onClose: () => void
}

interface Shortcut {
  keys: string[]
  description: string
}

const GLOBAL_SHORTCUTS: Shortcut[] = [
  { keys: ['?'], description: '显示/隐藏快捷键说明' },
  { keys: ['/'], description: '聚焦搜索框' },
  { keys: ['g', 'h'], description: '跳转到首页（按 g 再按 h）' },
  { keys: ['g', 'n'], description: '跳转到通知（按 g 再按 n）' },
  { keys: ['g', 'p'], description: '跳转到个人主页（按 g 再按 p）' },
  { keys: ['g', 'w'], description: '跳转到写作页（按 g 再按 w）' },
  { keys: ['Esc'], description: '关闭对话框 / 取消操作' },
]

const POST_SHORTCUTS: Shortcut[] = [
  { keys: ['←'], description: '上一篇文章' },
  { keys: ['→'], description: '下一篇文章' },
  { keys: ['f'], description: '切换收藏' },
  { keys: ['l'], description: '切换点赞' },
  { keys: ['c'], description: '滚动到评论区' },
  { keys: ['t'], description: '显示/隐藏目录' },
]

export default function KeyboardShortcuts({ open, onClose }: Props) {
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="kbd-overlay"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="kbd-dialog" ref={dialogRef} role="dialog" aria-modal="true" aria-label="键盘快捷键">
        <div className="kbd-header">
          <h2 className="kbd-title">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="4" width="20" height="16" rx="2" ry="2"></rect>
              <path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M6 12h.01M10 12h.01M14 12h.01M18 12h.01M7 16h10"></path>
            </svg>
            键盘快捷键
          </h2>
          <button type="button" className="kbd-close" onClick={onClose} aria-label="关闭">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div className="kbd-body">
          <section className="kbd-section">
            <h3 className="kbd-section-title">全局快捷键</h3>
            <ul className="kbd-list">
              {GLOBAL_SHORTCUTS.map((s, i) => (
                <li key={i} className="kbd-item">
                  <span className="kbd-item-keys">
                    {s.keys.map((k, ki) => (
                      <span key={ki} className="kbd-key">
                        {k}
                        {ki < s.keys.length - 1 && <span className="kbd-key-plus">+</span>}
                      </span>
                    ))}
                  </span>
                  <span className="kbd-item-desc">{s.description}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="kbd-section">
            <h3 className="kbd-section-title">文章页快捷键</h3>
            <ul className="kbd-list">
              {POST_SHORTCUTS.map((s, i) => (
                <li key={i} className="kbd-item">
                  <span className="kbd-item-keys">
                    {s.keys.map((k, ki) => (
                      <span key={ki} className="kbd-key">
                        {k}
                        {ki < s.keys.length - 1 && <span className="kbd-key-plus">+</span>}
                      </span>
                    ))}
                  </span>
                  <span className="kbd-item-desc">{s.description}</span>
                </li>
              ))}
            </ul>
          </section>

          <p className="kbd-hint">提示：连续按两个键（如 g 再按 h）执行组合操作</p>
        </div>
      </div>
    </div>
  )
}
