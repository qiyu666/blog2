import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { searchPosts } from '../api'
import type { SearchResult } from '../types'
import PostCard from '../components/PostCard'

export default function Search() {
  const [params] = useSearchParams()
  const q = params.get('q') || ''
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!q) {
      setResults([])
      return
    }
    setLoading(true)
    setError('')
    searchPosts(q)
      .then((data) => {
        setResults(data.posts)
        setLoading(false)
      })
      .catch((err) => {
        setError(err.message)
        setLoading(false)
      })
  }, [q])

  return (
    <div className="container search-page">
      <Link to="/" className="back-link">← 返回论坛</Link>
      <h1 className="search-page__title">
        {q ? (
          <>搜索「<span className="search-page__q">{q}</span>」的结果</>
        ) : (
          '搜索帖子'
        )}
      </h1>

      {!q && (
        <p className="search-page__hint">在顶部搜索框输入关键词，搜索帖子的标题、摘要、正文和标签。</p>
      )}

      {loading && <div className="loading">搜索中…</div>}
      {error && <div className="form__error">{error}</div>}

      {!loading && q && results.length === 0 && !error && (
        <div className="empty-state">
          <div className="empty-state__icon">🔍</div>
          <p className="empty-state__msg">没有找到匹配「{q}」的帖子</p>
        </div>
      )}

      {results.length > 0 && (
        <>
          <p className="search-page__count">共 {results.length} 条结果</p>
          <div className="posts-grid">
            {results.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
