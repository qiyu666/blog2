import { useState, useEffect, FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

export default function SearchBar() {
  const [q, setQ] = useState('')
  const navigate = useNavigate()
  const [params] = useSearchParams()

  // 进入搜索页时把 URL 里的 q 同步进输入框
  const currentQ = params.get('q') || ''
  useEffect(() => {
    setQ(currentQ)
  }, [currentQ])

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const trimmed = q.trim()
    if (!trimmed) return
    navigate(`/search?q=${encodeURIComponent(trimmed)}`)
  }

  return (
    <form className="search-bar" onSubmit={handleSubmit} role="search">
      <span className="search-bar__icon" aria-hidden>🔍</span>
      <input
        className="search-bar__input"
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="搜索帖子…"
        aria-label="搜索帖子"
        maxLength={100}
      />
      {q && (
        <button
          type="button"
          className="search-bar__clear"
          onClick={() => setQ('')}
          aria-label="清空"
        >
          ×
        </button>
      )}
    </form>
  )
}
