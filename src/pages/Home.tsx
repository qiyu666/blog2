import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import type { Post } from '../types'
import { getPosts } from '../api'
import PostCard from '../components/PostCard'
import SEO from '../components/SEO'
import { useAuth } from '../auth/AuthContext'

type SortKey = 'latest' | 'trending' | 'featured'

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'latest', label: '最新' },
  { key: 'trending', label: '热门' },
  { key: 'featured', label: '精华' },
]

function formatNumber(n: number): string {
  if (n >= 10000) return (n / 1000).toFixed(1) + 'k'
  return String(n)
}

function formatDate(dateStr: string): string {
  return new Date(dateStr + 'Z').toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export default function Home() {
  const { user } = useAuth()
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [sort, setSort] = useState<SortKey>('latest')
  const [activeCategory, setActiveCategory] = useState<string>('all')

  useEffect(() => {
    setLoading(true)
    const sortParam = sort === 'latest' ? undefined : sort
    getPosts(sortParam)
      .then(data => {
        setPosts(data)
        setLoading(false)
      })
      .catch(err => {
        setError(err.message)
        setLoading(false)
      })
  }, [sort])

  // 分类统计
  const categories = useMemo(() => {
    const map = new Map<string, number>()
    posts.forEach((p) => {
      const cats = p.category?.split('/').map((c) => c.trim()) || []
      cats.forEach((c) => {
        if (c) map.set(c, (map.get(c) || 0) + 1)
      })
    })
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
  }, [posts])

  // 标签统计
  const tags = useMemo(() => {
    const map = new Map<string, number>()
    posts.forEach((p) => {
      const tagList = p.tags?.split(',').map((t) => t.trim()) || []
      tagList.forEach((t) => {
        if (t) map.set(t, (map.get(t) || 0) + 1)
      })
    })
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20)
  }, [posts])

  // 按分类筛选
  const filteredPosts = useMemo(() => {
    if (activeCategory === 'all') return posts
    return posts.filter((p) => {
      const cats = p.category?.split('/').map((c) => c.trim()) || []
      return cats.includes(activeCategory)
    })
  }, [posts, activeCategory])

  // 热门文章
  const hotPosts = useMemo(() => {
    return [...posts]
      .sort((a, b) => (b.views || 0) - (a.views || 0))
      .slice(0, 5)
  }, [posts])

  // 置顶和精选文章
  const pinnedPost = useMemo(() => posts.find((p) => p.is_pinned), [posts])
  const featuredPosts = useMemo(() => posts.filter((p) => p.is_featured && !p.is_pinned).slice(0, 2), [posts])
  const normalPosts = useMemo(() => filteredPosts.filter((p) => !p.is_pinned), [filteredPosts])

  // 统计数据
  const stats = useMemo(() => {
    const totalViews = posts.reduce((s, p) => s + (p.views || 0), 0)
    const totalLikes = posts.reduce((s, p) => s + (p.likes_count || 0), 0)
    const totalComments = posts.reduce((s, p) => s + (p.comments_count || 0), 0)
    return { totalViews, totalLikes, totalComments }
  }, [posts])

  if (loading) return <div className="loading">正在加载…</div>
  if (error) return (
    <div className="error-state">
      <h2 className="error-state__title">无法加载帖子</h2>
      <p className="error-state__msg">{error}</p>
    </div>
  )
  if (posts.length === 0) return (
    <div className="error-state">
      <h2 className="error-state__title">还没有帖子</h2>
      <p className="error-state__msg">
        <Link to="/new" style={{ color: 'var(--accent)' }}>写第一篇吧</Link>
      </p>
    </div>
  )

  return (
    <>
      <SEO title="Marginalia - 慢思随笔" description="Marginalia — 一个慢节奏的随笔社区。记录阅读、写作、注意力与设计相关的随想与田野笔记。" />

      {/* Hero 区域 */}
      <section className="home-hero">
        <div className="home-hero__bg">
          <div className="home-hero__gradient home-hero__gradient--1"></div>
          <div className="home-hero__gradient home-hero__gradient--2"></div>
          <div className="home-hero__gradient home-hero__gradient--3"></div>
          <div className="home-hero__grid-bg"></div>
        </div>
        <div className="container home-hero__container">
          <div className="home-hero__content">
            <div className="home-hero__badge">
              <span className="home-hero__badge-dot"></span>
              慢思随笔 · 第 {posts.length} 期
            </div>
            <h1 className="home-hero__title">
              让想法
              <span className="home-hero__title-gradient">慢慢相遇</span>
            </h1>
            <p className="home-hero__subtitle">
              记录阅读、写作、注意力与设计的田野笔记。
              不定期发布，细细品读——在这个快节奏的时代里，
              <em>保留一方慢思考的角落。</em>
            </p>
            <div className="home-hero__actions">
              <Link to="/new" className="home-hero__btn home-hero__btn--primary">
                <span>✍️</span>
                开始写作
              </Link>
              <a href="#posts" className="home-hero__btn home-hero__btn--ghost">
                浏览文章
                <span>↓</span>
              </a>
            </div>
            <div className="home-hero__stats">
              <div className="home-hero__stat">
                <span className="home-hero__stat-num">{posts.length}</span>
                <span className="home-hero__stat-label">篇文章</span>
              </div>
              <div className="home-hero__divider"></div>
              <div className="home-hero__stat">
                <span className="home-hero__stat-num">{formatNumber(stats.totalViews)}</span>
                <span className="home-hero__stat-label">次阅读</span>
              </div>
              <div className="home-hero__divider"></div>
              <div className="home-hero__stat">
                <span className="home-hero__stat-num">{categories.length}</span>
                <span className="home-hero__stat-label">个专题</span>
              </div>
              <div className="home-hero__divider"></div>
              <div className="home-hero__stat">
                <span className="home-hero__stat-num">{tags.length}</span>
                <span className="home-hero__stat-label">个标签</span>
              </div>
            </div>
          </div>
          <div className="home-hero__visual">
            {pinnedPost && (
              <Link to={`/post/${pinnedPost.slug}`} className="hero-feature-card">
                <div className="hero-feature-card__image">
                  {pinnedPost.cover_image && <img src={pinnedPost.cover_image} alt="" />}
                  <div className="hero-feature-card__overlay"></div>
                  <span className="hero-feature-card__badge">
                    <span className="hero-feature-card__badge-icon">📌</span>
                    置顶
                  </span>
                </div>
                <div className="hero-feature-card__body">
                  <div className="hero-feature-card__category">{pinnedPost.category}</div>
                  <h3 className="hero-feature-card__title">{pinnedPost.title}</h3>
                  <p className="hero-feature-card__excerpt">{pinnedPost.excerpt?.slice(0, 60)}…</p>
                  <div className="hero-feature-card__meta">
                    <span>{pinnedPost.author}</span>
                    <span>·</span>
                    <span>{formatDate(pinnedPost.created_at)}</span>
                  </div>
                </div>
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* 分类导航 */}
      {categories.length > 0 && (
        <section className="category-nav">
          <div className="container">
            <div className="category-nav__inner">
              <button
                type="button"
                className={`category-nav__item ${activeCategory === 'all' ? 'category-nav__item--active' : ''}`}
                onClick={() => setActiveCategory('all')}
              >
                <span className="category-nav__icon">📚</span>
                <span className="category-nav__name">全部</span>
                <span className="category-nav__count">{posts.length}</span>
              </button>
              {categories.slice(0, 8).map((cat) => (
                <button
                  key={cat.name}
                  type="button"
                  className={`category-nav__item ${activeCategory === cat.name ? 'category-nav__item--active' : ''}`}
                  onClick={() => setActiveCategory(cat.name)}
                >
                  <span className="category-nav__name">{cat.name}</span>
                  <span className="category-nav__count">{cat.count}</span>
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 精选文章 */}
      {featuredPosts.length > 0 && activeCategory === 'all' && (
        <section className="featured-section">
          <div className="container">
            <div className="section-head">
              <div>
                <span className="section-head__label">精选推荐</span>
                <h2 className="section-head__title">编辑精选</h2>
              </div>
              <Link to="/" className="section-head__more">查看全部 →</Link>
            </div>
            <div className="featured-grid">
              {featuredPosts.map((post, i) => (
                <Link to={`/post/${post.slug}`} key={post.id} className={`featured-grid__item featured-grid__item--${i === 0 ? 'large' : 'small'}`}>
                  <div className="featured-grid__image">
                    {post.cover_image && <img src={post.cover_image} alt="" />}
                    <div className="featured-grid__gradient"></div>
                    <div className="featured-grid__badges">
                      <span className="featured-grid__badge">
                        <span>⭐</span> 精选
                      </span>
                      <span className="featured-grid__category">{post.category}</span>
                    </div>
                  </div>
                  <div className="featured-grid__content">
                    <h3 className="featured-grid__title">{post.title}</h3>
                    <p className="featured-grid__excerpt">{post.excerpt?.slice(0, 80)}…</p>
                    <div className="featured-grid__meta">
                      <span>{post.author}</span>
                      <span>·</span>
                      <span>{formatDate(post.created_at)}</span>
                      <span>·</span>
                      <span>👁 {formatNumber(post.views)}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 主内容区 + 侧边栏 */}
      <section className="home-main-section" id="posts">
        <div className="container home-main">
          {/* 主内容 */}
          <div className="home-main__content">
            <div className="section-head">
              <div>
                <span className="section-head__label">
                  {activeCategory === 'all' ? '全部文章' : activeCategory}
                </span>
                <h2 className="section-head__title">
                  {activeCategory === 'all' ? '最新发布' : `${activeCategory} 专题`}
                </h2>
              </div>
              <div className="sort-tabs" role="tablist" aria-label="排序方式">
                {SORT_OPTIONS.map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    role="tab"
                    aria-selected={sort === opt.key}
                    className={`sort-tabs__btn ${sort === opt.key ? 'sort-tabs__btn--active' : ''}`}
                    onClick={() => setSort(opt.key)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {normalPosts.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state__icon">📝</div>
                <p className="empty-state__msg">该分类下暂无文章</p>
              </div>
            ) : (
              <div className="post-list">
                {normalPosts.map((post, index) => (
                  <PostCard key={post.id} post={post} index={index} />
                ))}
              </div>
            )}
          </div>

          {/* 侧边栏 */}
          <aside className="home-sidebar">
            {/* 博主信息 */}
            <div className="sidebar-card sidebar-card--profile">
              <div className="sidebar-card__header-gradient"></div>
              <div className="sidebar-profile">
                <div className="sidebar-profile__avatar">
                  {user?.avatar ? (
                    <img src={user.avatar} alt="" />
                  ) : (
                    <span>M</span>
                  )}
                </div>
                <div className="sidebar-profile__info">
                  <h3 className="sidebar-profile__name">关于本站</h3>
                  <p className="sidebar-profile__bio">
                    慢思随笔 — 一个关于阅读、写作、注意力与设计的个人博客。
                    在快节奏的时代里，保留一方慢思考的角落。
                  </p>
                </div>
                <div className="sidebar-profile__stats">
                  <div className="sidebar-profile__stat">
                    <span className="sidebar-profile__stat-num">{posts.length}</span>
                    <span className="sidebar-profile__stat-label">文章</span>
                  </div>
                  <div className="sidebar-profile__stat">
                    <span className="sidebar-profile__stat-num">{formatNumber(stats.totalViews)}</span>
                    <span className="sidebar-profile__stat-label">阅读</span>
                  </div>
                  <div className="sidebar-profile__stat">
                    <span className="sidebar-profile__stat-num">{categories.length}</span>
                    <span className="sidebar-profile__stat-label">专题</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 热门文章 */}
            {hotPosts.length > 0 && (
              <div className="sidebar-card">
                <div className="sidebar-card__header">
                  <h3 className="sidebar-card__title">🔥 热门文章</h3>
                </div>
                <div className="sidebar-card__body">
                  <div className="hot-posts">
                    {hotPosts.map((post, i) => (
                      <Link to={`/post/${post.slug}`} key={post.id} className="hot-post">
                        <span className="hot-post__rank">{i + 1}</span>
                        <div className="hot-post__content">
                          <h4 className="hot-post__title">{post.title}</h4>
                          <div className="hot-post__meta">
                            <span>👁 {formatNumber(post.views)}</span>
                            <span>·</span>
                            <span>♡ {post.likes_count || 0}</span>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 标签云 */}
            {tags.length > 0 && (
              <div className="sidebar-card">
                <div className="sidebar-card__header">
                  <h3 className="sidebar-card__title">🏷️ 热门标签</h3>
                </div>
                <div className="sidebar-card__body">
                  <div className="sidebar-tags">
                    {tags.slice(0, 15).map((tag) => (
                      <span key={tag.name} className="sidebar-tag">
                        {tag.name}
                        <span className="sidebar-tag__count">{tag.count}</span>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 分类列表 */}
            {categories.length > 0 && (
              <div className="sidebar-card">
                <div className="sidebar-card__header">
                  <h3 className="sidebar-card__title">📂 全部分类</h3>
                </div>
                <div className="sidebar-card__body">
                  <div className="sidebar-categories">
                    {categories.map((cat) => (
                      <button
                        key={cat.name}
                        type="button"
                        className={`sidebar-category ${activeCategory === cat.name ? 'sidebar-category--active' : ''}`}
                        onClick={() => setActiveCategory(cat.name)}
                      >
                        <span className="sidebar-category__name">{cat.name}</span>
                        <span className="sidebar-category__count">{cat.count}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </aside>
        </div>
      </section>
    </>
  )
}
