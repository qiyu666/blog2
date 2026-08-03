import { useEffect, useState } from 'react'

export interface TocItem {
  level: number
  text: string
  id: string
}

interface TableOfContentsProps {
  items: TocItem[]
}

const MAX_TOC_TEXT = 38

function truncate(text: string, max: number): string {
  if (text.length <= max) return text
  return text.slice(0, max - 1) + '…'
}

export default function TableOfContents({ items }: TableOfContentsProps) {
  const [activeId, setActiveId] = useState<string>('')
  const [collapsed, setCollapsed] = useState<boolean>(false)

  useEffect(() => {
    if (items.length === 0) return

    const headings = items
      .map((i) => document.getElementById(i.id))
      .filter((el): el is HTMLElement => !!el)

    if (headings.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (visible.length > 0) {
          setActiveId(visible[0].target.id)
        }
      },
      {
        rootMargin: '0px 0px -70% 0px',
        threshold: [0, 1],
      }
    )

    headings.forEach((h) => observer.observe(h))
    return () => observer.disconnect()
  }, [items])

  if (items.length < 2) return null

  return (
    <nav className={`toc${collapsed ? ' toc--collapsed' : ''}`} aria-label="文章目录">
      <div className="toc__header">
        <h4 className="toc__title">目录</h4>
        <button
          type="button"
          className="toc__toggle"
          onClick={() => setCollapsed((c) => !c)}
          aria-expanded={!collapsed}
          title={collapsed ? '展开目录' : '折叠目录'}
        >
          {collapsed ? '▸' : '▾'}
        </button>
      </div>
      {!collapsed && (
        <ul className="toc__list">
          {items.map((item) => (
            <li
              key={item.id}
              className={`toc__item toc__item--l${item.level}${activeId === item.id ? ' toc__item--active' : ''}`}
              title={item.text}
            >
              <a
                href={`#${item.id}`}
                onClick={(e) => {
                  e.preventDefault()
                  const el = document.getElementById(item.id)
                  if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
                    history.replaceState(null, '', `#${item.id}`)
                  }
                }}
              >
                <span className="toc__item-text">{truncate(item.text, MAX_TOC_TEXT)}</span>
              </a>
            </li>
          ))}
        </ul>
      )}
      {collapsed && (
        <div className="toc__collapsed-hint">
          {items.length} 个章节 · 点击展开
        </div>
      )}
    </nav>
  )
}
