import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import SEO from '../components/SEO'
import PostCard from '../components/PostCard'
import { getPostsByTag, getTags, type TagStat } from '../api'
import type { Post } from '../types'

export default function TagPage() {
  const { tag = '' } = useParams<{ tag: string }>()
  const decodedTag = decodeURIComponent(tag)
  const [posts, setPosts] = useState<Post[]>([])
  const [allTags, setAllTags] = useState<TagStat[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([getPostsByTag(decodedTag), getTags()])
      .then(([p, t]) => {
        setPosts(p)
        setAllTags(t)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [decodedTag])

  const maxCount = allTags.length > 0 ? allTags[0].count : 1

  return (
    <div className="container tag-page">
      <SEO
        title={`#${decodedTag} — Marginalia`}
        description={`包含标签 ${decodedTag} 的全部文章`}
      />
      <Link to="/" className="back-link">← 返回首页</Link>
      <h1 className="tag-page__title">
        <span className="tag-page__hash">#</span>{decodedTag}
      </h1>
      <p className="tag-page__count">{posts.length} 篇文章</p>

      <div className="tag-page__layout">
        <div className="tag-page__main">
          {loading && <div className="loading">加载中…</div>}
          {!loading && posts.length === 0 && (
            <div className="empty-state">
              <div className="empty-state__icon">🏷️</div>
              <p className="empty-state__msg">该标签下暂无文章</p>
            </div>
          )}
          {posts.length > 0 && (
            <div className="posts-grid">
              {posts.map((p) => (
                <PostCard key={p.id} post={p} />
              ))}
            </div>
          )}
        </div>

        <aside className="tag-page__sidebar">
          <h3 className="tag-page__sidebar-title">所有标签</h3>
          <div className="tag-cloud">
            {allTags.map((t) => {
              const size = 12 + Math.round((t.count / maxCount) * 12)
              const isActive = t.name === decodedTag
              return (
                <Link
                  key={t.name}
                  to={`/tag/${encodeURIComponent(t.name)}`}
                  className={`tag-cloud__item${isActive ? ' tag-cloud__item--active' : ''}`}
                  style={{ fontSize: `${size}px` }}
                >
                  #{t.name}
                  <span className="tag-cloud__count">{t.count}</span>
                </Link>
              )
            })}
          </div>
        </aside>
      </div>
    </div>
  )
}
