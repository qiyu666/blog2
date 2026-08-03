import { useEffect, useState } from 'react'

export interface TocItem {
  level: number
  text: string
  id: string
}

interface TableOfContentsProps {
  items: TocItem[]
}

/** 文章目录：跟随滚动高亮当前章节，点击平滑跳转 */
export default function TableOfContents({ items }: TableOfContentsProps) {
  const [activeId, setActiveId] = useState<string>('')

  useEffect(() => {
    if (items.length === 0) return

    const headings = items
      .map((i) => document.getElementById(i.id))
      .filter((el): el is HTMLElement => !!el)

    if (headings.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        // 找到最靠近视口顶部、且仍可见的标题
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
    <nav className="toc" aria-label="文章目录">
      <h4 className="toc__title">目录</h4>
      <ul className="toc__list">
        {items.map((item) => (
          <li
            key={item.id}
            className={`toc__item toc__item--l${item.level}${activeId === item.id ? ' toc__item--active' : ''}`}
          >
            <a
              href={`#${item.id}`}
              onClick={(e) => {
                e.preventDefault()
                const el = document.getElementById(item.id)
                if (el) {
                  el.scrollIntoView({ behavior: 'smooth', block: 'start' })
                  // 更新 hash 但不触发默认跳转
                  history.replaceState(null, '', `#${item.id}`)
                }
              }}
            >
              {item.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}
