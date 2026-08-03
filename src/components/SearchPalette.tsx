import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { searchPosts } from '../api'
import type { SearchResult } from '../types'

export default function SearchPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [q, setQ] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()

  // 打开时聚焦输入框
  useEffect(() => {
    if (open) {
      setQ('')
      setResults([])
      setActiveIndex(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  // 防抖搜索
  useEffect(() => {
    if (!q.trim()) {
      setResults([])
      return
    }
    setLoading(true)
    const timer = setTimeout(() => {
      searchPosts(q.trim())
        .then((data) => {
          setResults(data.posts)
          setActiveIndex(0)
        })
        .catch(() => setResults([]))
        .finally(() => setLoading(false))
    }, 250)
    return () => clearTimeout(timer)
  }, [q])

  const go = useCallback(
    (slug: string) => {
      navigate(`/post/${slug}`)
      onClose()
    },
    [navigate, onClose]
  )

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && results[activeIndex]) {
      e.preventDefault()
      go(results[activeIndex].slug)
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
    }
  }

  if (!open) return null

  return (
    <div className="search-palette__overlay" onClick={onClose}>
      <div className="search-palette" onClick={(e) => e.stopPropagation()} onKeyDown={handleKeyDown}>
        <div className="search-palette__input-wrap">
          <span className="search-palette__icon">🔍</span>
          <input
            ref={inputRef}
            className="search-palette__input"
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="搜索文章标题、内容、标签…"
            aria-label="搜索"
            autoComplete="off"
          />
          {loading && <span className="search-palette__loading">⏳</span>}
          <kbd className="search-palette__esc">ESC</kbd>
        </div>

        {q.trim() && !loading && results.length === 0 && (
          <div className="search-palette__empty">没有找到「{q}」相关的文章</div>
        )}

        {results.length > 0 && (
          <ul className="search-palette__results">
            {results.slice(0, 10).map((r, i) => (
              <li
                key={r.id}
                className={`search-palette__item${i === activeIndex ? ' search-palette__item--active' : ''}`}
                onMouseEnter={() => setActiveIndex(i)}
                onClick={() => go(r.slug)}
              >
                <div className="search-palette__item-main">
                  <span className="search-palette__item-title">{r.title}</span>
                  {r.category && <span className="search-palette__item-cat">{r.category}</span>}
                </div>
                {r.excerpt && (
                  <p
                    className="search-palette__item-excerpt"
                    dangerouslySetInnerHTML={{
                      __html: (r as SearchResult & { highlight?: string }).highlight
                        ? (r as SearchResult & { highlight?: string }).highlight!
                        : r.excerpt.slice(0, 80),
                    }}
                  />
                )}
                <div className="search-palette__item-meta">
                  <span>❤️ {r.likes_count ?? 0}</span>
                  <span>💬 {r.comments_count ?? 0}</span>
                  <span>👁 {r.views ?? 0}</span>
                </div>
              </li>
            ))}
          </ul>
        )}

        {!q.trim() && (
          <div className="search-palette__hint">
            <p>输入关键词搜索文章</p>
            <p className="search-palette__hint-sub">支持标题、摘要、正文和标签</p>
          </div>
        )}
      </div>
    </div>
  )
}
