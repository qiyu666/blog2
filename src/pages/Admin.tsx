import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  getAdminUsers,
  getAdminPosts,
  getAdminComments,
  getAdminReports,
  updateReportStatus,
  updateUserRole,
  deletePost,
  deleteComment,
  getBugs,
  batchPostAction,
  type AdminUser,
  type AdminPost,
  type AdminComment,
  type AdminReport,
  type BugReportItem,
} from '../api'
import { useAuth } from '../auth/AuthContext'

type MenuSection = {
  label: string
  items: MenuItem[]
}

type MenuItem = {
  key: string
  label: string
  icon: string
  count?: number
}

type Tab =
  | 'dashboard'
  | 'users'
  | 'posts'
  | 'categories'
  | 'tags'
  | 'pages'
  | 'comments'
  | 'reports'
  | 'bugs'
  | 'settings'

type BatchPostAction = 'delete' | 'publish' | 'unpublish' | 'pin' | 'unpin'

function formatTime(dateStr: string): string {
  return new Date(dateStr + 'Z').toLocaleString('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

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

export default function Admin() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<Tab>('dashboard')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  const [users, setUsers] = useState<AdminUser[]>([])
  const [posts, setPosts] = useState<AdminPost[]>([])
  const [comments, setComments] = useState<AdminComment[]>([])
  const [reports, setReports] = useState<AdminReport[]>([])
  const [bugs, setBugs] = useState<BugReportItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [postStatus, setPostStatus] = useState<'all' | 'published' | 'draft'>('all')

  async function load(tab: Tab) {
    setLoading(true)
    setError('')
    setQuery('')
    try {
      if (tab === 'users') setUsers(await getAdminUsers())
      else if (tab === 'posts' || tab === 'categories' || tab === 'tags') setPosts(await getAdminPosts())
      else if (tab === 'comments') setComments(await getAdminComments())
      else if (tab === 'bugs') setBugs(await getBugs())
      else if (tab === 'reports') setReports(await getAdminReports())
      else if (tab === 'dashboard') {
        const [u, p, c, b] = await Promise.all([
          getAdminUsers(),
          getAdminPosts(),
          getAdminComments(),
          getBugs(),
        ])
        setUsers(u)
        setPosts(p)
        setComments(c)
        setBugs(b)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load(activeTab)
  }, [activeTab])

  async function handleToggleRole(u: AdminUser) {
    const next = u.role === 'admin' ? 'member' : 'admin'
    if (!confirm(`确认将 @${u.username} 设为 ${next}？`)) return
    try {
      await updateUserRole(u.id, next)
      setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, role: next } : x)))
    } catch (err) {
      alert(err instanceof Error ? err.message : '操作失败')
    }
  }

  async function handleDeletePost(id: number, title: string) {
    if (!confirm(`确认删除帖子《${title}》？此操作不可撤销。`)) return
    try {
      await deletePost(id)
      setPosts((prev) => prev.filter((p) => p.id !== id))
    } catch (err) {
      alert(err instanceof Error ? err.message : '删除失败')
    }
  }

  async function handleDeleteComment(id: number) {
    if (!confirm('确认删除这条评论？')) return
    try {
      await deleteComment(id)
      setComments((prev) => prev.filter((c) => c.id !== id))
    } catch (err) {
      alert(err instanceof Error ? err.message : '删除失败')
    }
  }

  async function handleUpdateReportStatus(id: number, status: 'resolved' | 'dismissed') {
    const label = status === 'resolved' ? '通过' : '驳回'
    if (!confirm(`确认${label}这条举报？`)) return
    try {
      await updateReportStatus(id, status)
      setReports((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)))
    } catch (err) {
      alert(err instanceof Error ? err.message : '操作失败')
    }
  }

  async function handleUpdateBugStatus(id: number, status: 'open' | 'in_progress' | 'resolved' | 'closed') {
    if (!confirm(`确认将状态改为"${status}"？`)) return
    try {
      const res = await fetch(`/api/bugs?id=${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) throw new Error('更新失败')
      setBugs((prev) => prev.map((b) => (b.id === id ? { ...b, status } : b)))
    } catch (err) {
      alert(err instanceof Error ? err.message : '操作失败')
    }
  }

  async function handleTogglePinned(p: AdminPost) {
    try {
      const res = await fetch(`/api/admin/posts/${p.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_pinned: p.is_pinned ? 0 : 1 }),
      })
      if (!res.ok) throw new Error('操作失败')
      setPosts((prev) =>
        prev.map((x) => (x.id === p.id ? { ...x, is_pinned: x.is_pinned ? 0 : 1 } : x)),
      )
    } catch (err) {
      alert(err instanceof Error ? err.message : '操作失败')
    }
  }

  async function handleToggleFeatured(p: AdminPost) {
    try {
      const res = await fetch(`/api/admin/posts/${p.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_featured: p.is_featured ? 0 : 1 }),
      })
      if (!res.ok) throw new Error('操作失败')
      setPosts((prev) =>
        prev.map((x) => (x.id === p.id ? { ...x, is_featured: x.is_featured ? 0 : 1 } : x)),
      )
    } catch (err) {
      alert(err instanceof Error ? err.message : '操作失败')
    }
  }

  async function handleBatchPostAction(action: BatchPostAction, ids: number[]) {
    try {
      await batchPostAction(action, ids)
      if (action === 'delete') {
        setPosts((prev) => prev.filter((p) => !ids.includes(p.id)))
      } else if (action === 'publish') {
        setPosts((prev) =>
          prev.map((p) =>
            ids.includes(p.id) ? { ...p, published: 1, status: 'published' as const } : p,
          ),
        )
      } else if (action === 'unpublish') {
        setPosts((prev) =>
          prev.map((p) =>
            ids.includes(p.id) ? { ...p, published: 0, status: 'draft' as const } : p,
          ),
        )
      } else if (action === 'pin') {
        setPosts((prev) => prev.map((p) => (ids.includes(p.id) ? { ...p, is_pinned: 1 } : p)))
      } else if (action === 'unpin') {
        setPosts((prev) => prev.map((p) => (ids.includes(p.id) ? { ...p, is_pinned: 0 } : p)))
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : '批量操作失败')
      throw err
    }
  }

  // 统计数据
  const stats = useMemo(() => {
    const adminCount = users.filter((u) => u.role === 'admin').length
    const totalViews = posts.reduce((s, p) => s + (p.views || 0), 0)
    const totalLikes = posts.reduce((s, p) => s + (p.likes_count || 0), 0)
    const pendingReports = reports.filter((r) => r.status === 'pending').length
    const openBugs = bugs.filter((b) => b.status === 'open' || b.status === 'in_progress').length
    const publishedPosts = posts.filter((p) => p.status === 'published').length
    const draftPosts = posts.filter((p) => p.status === 'draft').length
    const todayPosts = posts.filter((p) => {
      const d = new Date(p.created_at + 'Z')
      const t = new Date()
      return d.toDateString() === t.toDateString()
    }).length
    const todayComments = comments.filter((c) => {
      const d = new Date(c.created_at + 'Z')
      const t = new Date()
      return d.toDateString() === t.toDateString()
    }).length

    return {
      users: users.length,
      admins: adminCount,
      posts: posts.length,
      publishedPosts,
      draftPosts,
      todayPosts,
      comments: comments.length,
      todayComments,
      views: totalViews,
      likes: totalLikes,
      reports: reports.length,
      pendingReports,
      bugs: bugs.length,
      openBugs,
    }
  }, [users, posts, comments, reports, bugs])

  // 分类统计
  const categoryStats = useMemo(() => {
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
  const tagStats = useMemo(() => {
    const map = new Map<string, number>()
    posts.forEach((p) => {
      const tags = p.tags?.split(',').map((t) => t.trim()) || []
      tags.forEach((t) => {
        if (t) map.set(t, (map.get(t) || 0) + 1)
      })
    })
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
  }, [posts])

  // 搜索过滤
  const filteredUsers = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return users
    return users.filter(
      (u) =>
        u.username.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q),
    )
  }, [users, query])

  const filteredPosts = useMemo(() => {
    const q = query.trim().toLowerCase()
    let result = posts
    if (postStatus !== 'all') {
      result = result.filter((p) => p.status === postStatus)
    }
    if (!q) return result
    return result.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        (p.author_username || '').toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q),
    )
  }, [posts, query, postStatus])

  const filteredComments = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return comments
    return comments.filter(
      (c) =>
        c.content.toLowerCase().includes(q) ||
        (c.author_username || '').toLowerCase().includes(q) ||
        (c.post_title || '').toLowerCase().includes(q),
    )
  }, [comments, query])

  const filteredReports = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return reports
    return reports.filter(
      (r) =>
        (r.reporter_username || '').toLowerCase().includes(q) ||
        (r.target_label || '').toLowerCase().includes(q) ||
        (r.reason || '').toLowerCase().includes(q) ||
        (r.target_type || '').toLowerCase().includes(q) ||
        (r.status || '').toLowerCase().includes(q),
    )
  }, [reports, query])

  const filteredBugs = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return bugs
    return bugs.filter(
      (b) =>
        (b.reporter_username || '').toLowerCase().includes(q) ||
        b.title.toLowerCase().includes(q) ||
        b.description.toLowerCase().includes(q) ||
        b.type.toLowerCase().includes(q) ||
        b.status.toLowerCase().includes(q),
    )
  }, [bugs, query])

  const filteredCategories = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return categoryStats
    return categoryStats.filter((c) => c.name.toLowerCase().includes(q))
  }, [categoryStats, query])

  const filteredTags = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return tagStats
    return tagStats.filter((t) => t.name.toLowerCase().includes(q))
  }, [tagStats, query])

  if (user?.role !== 'admin') {
    return (
      <div className="error-state">
        <h2 className="error-state__title">无权访问</h2>
        <p className="error-state__msg">该页面仅限管理员访问。</p>
      </div>
    )
  }

  // 菜单配置
  const menuSections: MenuSection[] = [
    {
      label: '概览',
      items: [
        { key: 'dashboard', label: '仪表盘', icon: '📊' },
      ],
    },
    {
      label: '内容管理',
      items: [
        { key: 'posts', label: '所有文章', icon: '📝', count: stats.posts },
        { key: 'categories', label: '分类管理', icon: '📂', count: categoryStats.length },
        { key: 'tags', label: '标签管理', icon: '🏷️', count: tagStats.length },
        { key: 'pages', label: '独立页面', icon: '📄' },
        { key: 'comments', label: '评论管理', icon: '💬', count: stats.comments },
      ],
    },
    {
      label: '用户管理',
      items: [
        { key: 'users', label: '所有用户', icon: '👥', count: stats.users },
      ],
    },
    {
      label: '社区管理',
      items: [
        { key: 'reports', label: '举报审核', icon: '⚑', count: stats.pendingReports },
        { key: 'bugs', label: 'Bug反馈', icon: '🐛', count: stats.openBugs },
      ],
    },
    {
      label: '系统设置',
      items: [
        { key: 'settings', label: '站点设置', icon: '⚙️' },
      ],
    },
  ]

  const breadcrumbMap: Record<Tab, string[]> = {
    dashboard: ['概览', '仪表盘'],
    users: ['用户管理', '所有用户'],
    posts: ['内容管理', '所有文章'],
    categories: ['内容管理', '分类管理'],
    tags: ['内容管理', '标签管理'],
    pages: ['内容管理', '独立页面'],
    comments: ['内容管理', '评论管理'],
    reports: ['社区管理', '举报审核'],
    bugs: ['社区管理', 'Bug反馈'],
    settings: ['系统设置', '站点设置'],
  }

  const pageTitles: Record<Tab, { title: string; desc: string }> = {
    dashboard: { title: '仪表盘', desc: '查看站点数据概览和最新动态' },
    users: { title: '所有用户', desc: '管理注册用户、角色和权限' },
    posts: { title: '所有文章', desc: '管理文章、置顶和精选' },
    categories: { title: '分类管理', desc: '管理文章分类和排序' },
    tags: { title: '标签管理', desc: '管理文章标签' },
    pages: { title: '独立页面', desc: '管理关于页、友链页等独立页面' },
    comments: { title: '评论管理', desc: '审核和管理用户评论' },
    reports: { title: '举报审核', desc: '处理用户举报内容' },
    bugs: { title: 'Bug反馈', desc: '处理用户提交的Bug和建议' },
    settings: { title: '站点设置', desc: '配置站点基本信息和功能开关' },
  }

  return (
    <div className={`admin-new ${sidebarCollapsed ? 'admin-new--collapsed' : ''}`}>
      {/* 侧边栏 */}
      <aside className="admin-sidebar">
        <div className="admin-sidebar__header">
          <div className="admin-sidebar__brand">
            <span className="admin-sidebar__brand-icon">⚡</span>
            {!sidebarCollapsed && (
              <div className="admin-sidebar__brand-text">
                <div className="admin-sidebar__brand-title">管理后台</div>
                <div className="admin-sidebar__brand-sub">Marginalia</div>
              </div>
            )}
          </div>
          <button
            type="button"
            className="admin-sidebar__toggle"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            title={sidebarCollapsed ? '展开侧边栏' : '收起侧边栏'}
          >
            {sidebarCollapsed ? '→' : '←'}
          </button>
        </div>

        <nav className="admin-sidebar__nav">
          {menuSections.map((section) => (
            <div key={section.label} className="admin-sidebar__section">
              {!sidebarCollapsed && (
                <div className="admin-sidebar__section-label">{section.label}</div>
              )}
              <div className="admin-sidebar__items">
                {section.items.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    className={`admin-sidebar__item ${
                      activeTab === item.key ? 'admin-sidebar__item--active' : ''
                    }`}
                    onClick={() => setActiveTab(item.key as Tab)}
                    title={sidebarCollapsed ? item.label : ''}
                  >
                    <span className="admin-sidebar__item-icon">{item.icon}</span>
                    {!sidebarCollapsed && (
                      <>
                        <span className="admin-sidebar__item-label">{item.label}</span>
                        {item.count !== undefined && item.count > 0 && (
                          <span className="admin-sidebar__item-count">{item.count}</span>
                        )}
                      </>
                    )}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="admin-sidebar__footer">
          <div className="admin-sidebar__user">
            <div className="admin-sidebar__avatar">
              {user?.avatar ? (
                <img src={user.avatar} alt="" />
              ) : (
                <span>{user?.username?.[0]?.toUpperCase()}</span>
              )}
            </div>
            {!sidebarCollapsed && (
              <div className="admin-sidebar__user-info">
                <div className="admin-sidebar__user-name">@{user?.username}</div>
                <div className="admin-sidebar__user-role">超级管理员</div>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* 主内容区 */}
      <main className="admin-main">
        {/* 顶部栏 */}
        <header className="admin-main__header">
          <div className="admin-breadcrumb">
            {breadcrumbMap[activeTab].map((item, i) => (
              <span key={i} className="admin-breadcrumb__item">
                {i > 0 && <span className="admin-breadcrumb__sep">/</span>}
                {item}
              </span>
            ))}
          </div>
          <div className="admin-main__header-actions">
            <Link to="/" className="admin-action admin-action--ghost">
              ← 返回首页
            </Link>
          </div>
        </header>

        {/* 页面内容 */}
        <div className="admin-content">
          {/* 页面标题 */}
          <div className="admin-page-header">
            <div>
              <h1 className="admin-page-header__title">{pageTitles[activeTab].title}</h1>
              <p className="admin-page-header__desc">{pageTitles[activeTab].desc}</p>
            </div>
            {activeTab === 'posts' && (
              <Link to="/new" className="admin-btn admin-btn--primary">
                <span>＋</span> 写新文章
              </Link>
            )}
            {activeTab === 'categories' && (
              <button
                type="button"
                className="admin-btn admin-btn--primary"
                onClick={() => alert('分类创建功能开发中')}
              >
                <span>＋</span> 新建分类
              </button>
            )}
          </div>

          {/* 仪表盘 */}
          {activeTab === 'dashboard' && (
            <DashboardView stats={stats} posts={posts} comments={comments} users={users} categoryStats={categoryStats} />
          )}

          {/* 用户管理 */}
          {activeTab === 'users' && (
            <UsersView
              users={filteredUsers}
              totalUsers={users.length}
              loading={loading}
              error={error}
              query={query}
              setQuery={setQuery}
              onToggleRole={handleToggleRole}
              currentUserId={user?.id}
            />
          )}

          {/* 文章管理 */}
          {activeTab === 'posts' && (
            <PostsView
              posts={filteredPosts}
              totalPosts={posts.length}
              loading={loading}
              error={error}
              query={query}
              setQuery={setQuery}
              postStatus={postStatus}
              setPostStatus={setPostStatus}
              stats={stats}
              onDelete={handleDeletePost}
              onTogglePinned={handleTogglePinned}
              onToggleFeatured={handleToggleFeatured}
              onBatchAction={handleBatchPostAction}
            />
          )}

          {/* 分类管理 */}
          {activeTab === 'categories' && (
            <CategoriesView
              categories={filteredCategories}
              totalCategories={categoryStats.length}
              loading={loading}
              error={error}
              query={query}
              setQuery={setQuery}
            />
          )}

          {/* 标签管理 */}
          {activeTab === 'tags' && (
            <TagsView
              tags={filteredTags}
              totalTags={tagStats.length}
              loading={loading}
              error={error}
              query={query}
              setQuery={setQuery}
            />
          )}

          {/* 独立页面 */}
          {activeTab === 'pages' && (
            <EmptyState text="独立页面功能开发中..." icon="📄" />
          )}

          {/* 评论管理 */}
          {activeTab === 'comments' && (
            <CommentsView
              comments={filteredComments}
              totalComments={comments.length}
              loading={loading}
              error={error}
              query={query}
              setQuery={setQuery}
              onDelete={handleDeleteComment}
            />
          )}

          {/* 举报审核 */}
          {activeTab === 'reports' && (
            <ReportsView
              reports={filteredReports}
              totalReports={reports.length}
              loading={loading}
              error={error}
              query={query}
              setQuery={setQuery}
              onUpdateStatus={handleUpdateReportStatus}
            />
          )}

          {/* Bug反馈 */}
          {activeTab === 'bugs' && (
            <BugsView
              bugs={filteredBugs}
              totalBugs={bugs.length}
              loading={loading}
              error={error}
              query={query}
              setQuery={setQuery}
              onUpdateStatus={handleUpdateBugStatus}
            />
          )}

          {/* 站点设置 */}
          {activeTab === 'settings' && (
            <SettingsView />
          )}
        </div>
      </main>
    </div>
  )
}

// ===== 仪表盘 =====
function DashboardView({
  stats,
  posts,
  comments,
  users,
  categoryStats,
}: {
  stats: any
  posts: AdminPost[]
  comments: AdminComment[]
  users: AdminUser[]
  categoryStats: { name: string; count: number }[]
}) {
  const statCards = [
    { label: '总用户数', value: stats.users, icon: '👥', color: 'var(--accent)', change: `+${Math.min(stats.users, 5)} 本周` },
    { label: '发布文章', value: stats.publishedPosts, icon: '📝', color: 'var(--violet)', change: `+${stats.todayPosts} 今日` },
    { label: '评论总数', value: stats.comments, icon: '💬', color: 'var(--pink)', change: `+${stats.todayComments} 今日` },
    { label: '总浏览量', value: formatNumber(stats.views), icon: '👁', color: 'var(--cyan)', change: `+${formatNumber(stats.likes)} 点赞` },
  ]

  const recentPosts = [...posts].sort((a, b) =>
    new Date(b.created_at + 'Z').getTime() - new Date(a.created_at + 'Z').getTime(),
  ).slice(0, 5)

  const recentComments = [...comments].sort((a, b) =>
    new Date(b.created_at + 'Z').getTime() - new Date(a.created_at + 'Z').getTime(),
  ).slice(0, 5)

  const recentUsers = [...users].sort((a, b) =>
    new Date(b.created_at + 'Z').getTime() - new Date(a.created_at + 'Z').getTime(),
  ).slice(0, 5)

  return (
    <div className="dashboard">
      {/* 统计卡片 */}
      <div className="dashboard__stats">
        {statCards.map((card, i) => (
          <div
            key={i}
            className="stat-card"
            style={{ '--stat-color': card.color } as React.CSSProperties}
          >
            <div className="stat-card__icon">{card.icon}</div>
            <div className="stat-card__body">
              <div className="stat-card__value">{card.value}</div>
              <div className="stat-card__label">{card.label}</div>
            </div>
            <div className="stat-card__trend">{card.change}</div>
          </div>
        ))}
      </div>

      {/* 图表区域占位 */}
      <div className="dashboard__charts">
        <div className="chart-card">
          <div className="chart-card__header">
            <h3 className="chart-card__title">访问趋势</h3>
            <div className="chart-card__tabs">
              <button type="button" className="chart-card__tab chart-card__tab--active">7天</button>
              <button type="button" className="chart-card__tab">30天</button>
            </div>
          </div>
          <div className="chart-card__body">
            <div className="chart-placeholder">
              <div className="chart-placeholder__bars">
                {[40, 65, 45, 80, 55, 90, 70].map((h, i) => (
                  <div
                    key={i}
                    className="chart-placeholder__bar"
                    style={{ height: `${h}%` }}
                  />
                ))}
              </div>
              <div className="chart-placeholder__text">数据可视化开发中...</div>
            </div>
          </div>
        </div>

        <div className="chart-card chart-card--small">
          <div className="chart-card__header">
            <h3 className="chart-card__title">分类分布</h3>
          </div>
          <div className="chart-card__body">
            <div className="category-dist">
              {categoryStats.slice(0, 6).map((c, i) => (
                <div key={i} className="category-dist__item">
                  <div className="category-dist__head">
                    <span className="category-dist__name">{c.name}</span>
                    <span className="category-dist__count">{c.count} 篇</span>
                  </div>
                  <div className="category-dist__bar">
                    <div
                      className="category-dist__fill"
                      style={{
                        width: `${(c.count / (categoryStats[0]?.count || 1)) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 最新动态 */}
      <div className="dashboard__recent">
        {/* 最新文章 */}
        <div className="recent-card">
          <div className="recent-card__header">
            <h3 className="recent-card__title">最新文章</h3>
            <Link to="/admin" className="recent-card__more">查看全部 →</Link>
          </div>
          <div className="recent-card__body">
            {recentPosts.length === 0 ? (
              <EmptyState text="暂无文章" icon="📝" size="sm" />
            ) : (
              recentPosts.map((p) => (
                <div key={p.id} className="recent-item">
                  <div className="recent-item__content">
                    <Link to={`/post/${p.slug}`} className="recent-item__title">
                      {p.title}
                    </Link>
                    <div className="recent-item__meta">
                      <span>@{p.author_username}</span>
                      <span>·</span>
                      <span>{formatTime(p.created_at)}</span>
                    </div>
                  </div>
                  <div className="recent-item__stats">
                    <span>👁 {formatNumber(p.views)}</span>
                    <span>💬 {p.comments_count}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 最新评论 */}
        <div className="recent-card">
          <div className="recent-card__header">
            <h3 className="recent-card__title">最新评论</h3>
            <Link to="/admin" className="recent-card__more">查看全部 →</Link>
          </div>
          <div className="recent-card__body">
            {recentComments.length === 0 ? (
              <EmptyState text="暂无评论" icon="💬" size="sm" />
            ) : (
              recentComments.map((c) => (
                <div key={c.id} className="recent-item">
                  <div className="recent-item__content">
                    <div className="recent-item__comment">{c.content.slice(0, 50)}{c.content.length > 50 ? '...' : ''}</div>
                    <div className="recent-item__meta">
                      <span>@{c.author_username}</span>
                      <span>·</span>
                      <span>{formatTime(c.created_at)}</span>
                    </div>
                  </div>
                  <Link to={`/post/${c.post_slug}`} className="recent-item__post">
                    {c.post_title?.slice(0, 15) || ''}
                  </Link>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 最新用户 */}
        <div className="recent-card">
          <div className="recent-card__header">
            <h3 className="recent-card__title">最新注册</h3>
            <Link to="/admin" className="recent-card__more">查看全部 →</Link>
          </div>
          <div className="recent-card__body">
            {recentUsers.length === 0 ? (
              <EmptyState text="暂无用户" icon="👥" size="sm" />
            ) : (
              recentUsers.map((u) => (
                <div key={u.id} className="recent-item">
                  <div className="recent-item__user">
                    {u.avatar ? (
                      <img src={u.avatar} alt="" className="recent-item__avatar" />
                    ) : (
                      <div className="recent-item__avatar recent-item__avatar--placeholder">
                        {u.username[0]?.toUpperCase()}
                      </div>
                    )}
                    <div>
                      <Link to={`/${u.username}`} className="recent-item__username">
                        @{u.username}
                      </Link>
                      <div className="recent-item__meta">{formatDate(u.created_at)}</div>
                    </div>
                  </div>
                  <span className={`role-badge ${u.role === 'admin' ? 'role-badge--admin' : ''}`}>
                    {u.role === 'admin' ? '管理员' : '成员'}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ===== 用户管理 =====
function UsersView({
  users,
  totalUsers,
  loading,
  error,
  query,
  setQuery,
  onToggleRole,
  currentUserId,
}: {
  users: AdminUser[]
  totalUsers: number
  loading: boolean
  error: string
  query: string
  setQuery: (q: string) => void
  onToggleRole: (u: AdminUser) => void
  currentUserId?: number
}) {
  return (
    <div className="admin-list-view">
      <AdminToolbar
        placeholder="搜索用户名、邮箱、角色…"
        query={query}
        setQuery={setQuery}
        countText={`${users.length} / ${totalUsers} 个用户`}
        loading={loading}
      />
      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} />
      ) : users.length === 0 ? (
        <EmptyState text={query ? '没有匹配的用户' : '暂无用户'} icon="👥" />
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>用户</th>
                <th>邮箱</th>
                <th>角色</th>
                <th>帖子</th>
                <th>评论</th>
                <th>注册时间</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="admin-table__user">
                    <div className="admin-user-cell">
                      {u.avatar ? (
                        <img src={u.avatar} alt="" className="admin-user-cell__avatar" />
                      ) : (
                        <div className="admin-user-cell__avatar admin-user-cell__avatar--placeholder">
                          {u.username[0]?.toUpperCase()}
                        </div>
                      )}
                      <div>
                        <div className="admin-user-cell__name">
                          <Link to={`/${u.username}`}>@{u.username}</Link>
                        </div>
                        {u.id === currentUserId && (
                          <span className="admin-user-cell__self">你</span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="admin-table__email">{u.email}</td>
                  <td>
                    <span
                      className={`role-badge ${u.role === 'admin' ? 'role-badge--admin' : ''}`}
                    >
                      {u.role === 'admin' ? '管理员' : '成员'}
                    </span>
                  </td>
                  <td className="admin-table__num">{u.posts_count}</td>
                  <td className="admin-table__num">{u.comments_count}</td>
                  <td className="admin-table__time">{formatTime(u.created_at)}</td>
                  <td>
                    {u.id !== currentUserId ? (
                      <button
                        type="button"
                        className={`admin-action ${
                          u.role === 'admin' ? 'admin-action--warn' : 'admin-action--primary'
                        }`}
                        onClick={() => onToggleRole(u)}
                      >
                        {u.role === 'admin' ? '降为成员' : '升为管理员'}
                      </button>
                    ) : (
                      <span className="admin-table__muted">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ===== 文章管理 =====
function PostsView({
  posts,
  totalPosts,
  loading,
  error,
  query,
  setQuery,
  postStatus,
  setPostStatus,
  stats,
  onDelete,
  onTogglePinned,
  onToggleFeatured,
  onBatchAction,
}: {
  posts: AdminPost[]
  totalPosts: number
  loading: boolean
  error: string
  query: string
  setQuery: (q: string) => void
  postStatus: 'all' | 'published' | 'draft'
  setPostStatus: (s: 'all' | 'published' | 'draft') => void
  stats: any
  onDelete: (id: number, title: string) => void
  onTogglePinned: (p: AdminPost) => void
  onToggleFeatured: (p: AdminPost) => void
  onBatchAction: (action: BatchPostAction, ids: number[]) => Promise<void>
}) {
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())

  // 列表变化时清空选择（筛选/刷新后）
  useEffect(() => {
    setSelectedIds(new Set())
  }, [posts])

  const allSelected = posts.length > 0 && posts.every((p) => selectedIds.has(p.id))

  function toggleOne(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAll() {
    if (allSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(posts.map((p) => p.id)))
    }
  }

  async function runBatch(action: BatchPostAction) {
    const ids = Array.from(selectedIds)
    if (ids.length === 0) return
    const labels: Record<BatchPostAction, string> = {
      delete: '删除',
      publish: '发布',
      unpublish: '取消发布',
      pin: '置顶',
      unpin: '取消置顶',
    }
    if (!confirm(`确认批量${labels[action]} ${ids.length} 篇文章？`)) return
    try {
      await onBatchAction(action, ids)
      setSelectedIds(new Set())
    } catch {
      // 错误已在父级提示
    }
  }

  return (
    <div className="admin-list-view">
      {/* 状态筛选 */}
      <div className="admin-filters">
        <div className="admin-filters__tabs">
          {[
            { key: 'all', label: '全部', count: stats.posts },
            { key: 'published', label: '已发布', count: stats.publishedPosts },
            { key: 'draft', label: '草稿', count: stats.draftPosts },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              className={`admin-filter-tab ${postStatus === tab.key ? 'admin-filter-tab--active' : ''}`}
              onClick={() => setPostStatus(tab.key as 'all' | 'published' | 'draft')}
            >
              {tab.label}
              <span className="admin-filter-tab__count">{tab.count}</span>
            </button>
          ))}
        </div>
      </div>

      <AdminToolbar
        placeholder="搜索标题、作者、分类…"
        query={query}
        setQuery={setQuery}
        countText={`${posts.length} / ${totalPosts} 篇文章`}
        loading={loading}
      />

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} />
      ) : posts.length === 0 ? (
        <EmptyState text={query ? '没有匹配的文章' : '暂无文章'} icon="📝" />
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th style={{ width: 40 }}>
                  <input
                    type="checkbox"
                    className="admin-row__checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    aria-label="全选"
                  />
                </th>
                <th>标题</th>
                <th>作者</th>
                <th>分类</th>
                <th>状态</th>
                <th>浏览</th>
                <th>评论</th>
                <th>发布时间</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {posts.map((p) => (
                <tr key={p.id}>
                  <td>
                    <input
                      type="checkbox"
                      className="admin-row__checkbox"
                      checked={selectedIds.has(p.id)}
                      onChange={() => toggleOne(p.id)}
                      aria-label={`选择 ${p.title}`}
                    />
                  </td>
                  <td className="admin-table__title">
                    <div className="admin-post-title">
                      <Link to={`/post/${p.slug}`}>{p.title}</Link>
                      <div className="admin-post-badges">
                        {p.is_pinned && <span className="post-badge post-badge--pinned">置顶</span>}
                        {p.is_featured && <span className="post-badge post-badge--featured">精选</span>}
                      </div>
                    </div>
                  </td>
                  <td className="admin-table__author">
                    {p.author_username ? (
                      <Link to={`/${p.author_username}`}>@{p.author_username}</Link>
                    ) : (
                      <span className="admin-table__muted">匿名</span>
                    )}
                  </td>
                  <td>
                    <span className="admin-tag">{p.category}</span>
                  </td>
                  <td>
                    <span
                      className={`role-badge ${
                        p.status === 'published' ? 'role-badge--admin' : ''
                      }`}
                    >
                      {p.status === 'published' ? '已发布' : '草稿'}
                    </span>
                  </td>
                  <td className="admin-table__num">{formatNumber(p.views)}</td>
                  <td className="admin-table__num">{p.comments_count}</td>
                  <td className="admin-table__time">{formatTime(p.created_at)}</td>
                  <td>
                    <div className="admin-action-group">
                      <button
                        type="button"
                        className={`admin-action ${p.is_pinned ? 'admin-action--primary' : ''}`}
                        onClick={() => onTogglePinned(p)}
                      >
                        {p.is_pinned ? '取消置顶' : '置顶'}
                      </button>
                      <button
                        type="button"
                        className={`admin-action ${p.is_featured ? 'admin-action--primary' : ''}`}
                        onClick={() => onToggleFeatured(p)}
                      >
                        {p.is_featured ? '取消精选' : '精选'}
                      </button>
                      <Link to={`/edit/${p.id}`} className="admin-action">
                        编辑
                      </Link>
                      <button
                        type="button"
                        className="admin-action admin-action--danger"
                        onClick={() => onDelete(p.id, p.title)}
                      >
                        删除
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 批量操作栏 */}
      {selectedIds.size > 0 && (
        <div className="admin-batch-bar">
          <span className="admin-batch-bar__count">已选 {selectedIds.size} 篇</span>
          <button
            type="button"
            className="admin-batch-bar__btn"
            onClick={() => runBatch('publish')}
          >
            批量发布
          </button>
          <button
            type="button"
            className="admin-batch-bar__btn"
            onClick={() => runBatch('unpublish')}
          >
            取消发布
          </button>
          <button
            type="button"
            className="admin-batch-bar__btn"
            onClick={() => runBatch('pin')}
          >
            批量置顶
          </button>
          <button
            type="button"
            className="admin-batch-bar__btn"
            onClick={() => runBatch('unpin')}
          >
            取消置顶
          </button>
          <button
            type="button"
            className="admin-batch-bar__btn admin-batch-bar__btn--danger"
            onClick={() => runBatch('delete')}
          >
            批量删除
          </button>
        </div>
      )}
    </div>
  )
}

// ===== 分类管理 =====
function CategoriesView({
  categories,
  totalCategories,
  loading,
  error,
  query,
  setQuery,
}: {
  categories: { name: string; count: number }[]
  totalCategories: number
  loading: boolean
  error: string
  query: string
  setQuery: (q: string) => void
}) {
  return (
    <div className="admin-list-view">
      <AdminToolbar
        placeholder="搜索分类名称…"
        query={query}
        setQuery={setQuery}
        countText={`${categories.length} / ${totalCategories} 个分类`}
        loading={loading}
      />
      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} />
      ) : categories.length === 0 ? (
        <EmptyState text={query ? '没有匹配的分类' : '暂无分类'} icon="📂" />
      ) : (
        <div className="category-grid">
          {categories.map((c, i) => (
            <div key={i} className="category-card">
              <div className="category-card__icon">📂</div>
              <div className="category-card__body">
                <div className="category-card__name">{c.name}</div>
                <div className="category-card__count">{c.count} 篇文章</div>
              </div>
              <div className="category-card__actions">
                <button type="button" className="admin-btn admin-btn--sm">编辑</button>
                <button type="button" className="admin-btn admin-btn--sm admin-btn--danger-outline">
                  删除
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ===== 标签管理 =====
function TagsView({
  tags,
  totalTags,
  loading,
  error,
  query,
  setQuery,
}: {
  tags: { name: string; count: number }[]
  totalTags: number
  loading: boolean
  error: string
  query: string
  setQuery: (q: string) => void
}) {
  return (
    <div className="admin-list-view">
      <AdminToolbar
        placeholder="搜索标签名称…"
        query={query}
        setQuery={setQuery}
        countText={`${tags.length} / ${totalTags} 个标签`}
        loading={loading}
      />
      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} />
      ) : tags.length === 0 ? (
        <EmptyState text={query ? '没有匹配的标签' : '暂无标签'} icon="🏷️" />
      ) : (
        <div className="tag-cloud">
          {tags.map((t, i) => (
            <div key={i} className="tag-item" style={{ fontSize: `${12 + Math.min(t.count * 2, 12)}px` }}>
              <span className="tag-item__name">{t.name}</span>
              <span className="tag-item__count">×{t.count}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ===== 评论管理 =====
function CommentsView({
  comments,
  totalComments,
  loading,
  error,
  query,
  setQuery,
  onDelete,
}: {
  comments: AdminComment[]
  totalComments: number
  loading: boolean
  error: string
  query: string
  setQuery: (q: string) => void
  onDelete: (id: number) => void
}) {
  return (
    <div className="admin-list-view">
      <AdminToolbar
        placeholder="搜索评论内容、作者、帖子…"
        query={query}
        setQuery={setQuery}
        countText={`${comments.length} / ${totalComments} 条评论`}
        loading={loading}
      />
      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} />
      ) : comments.length === 0 ? (
        <EmptyState text={query ? '没有匹配的评论' : '暂无评论'} icon="💬" />
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>内容</th>
                <th>作者</th>
                <th>所属帖子</th>
                <th>时间</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {comments.map((c) => (
                <tr key={c.id}>
                  <td className="admin-table__content">{c.content}</td>
                  <td className="admin-table__author">
                    <Link to={`/${c.author_username}`}>@{c.author_username}</Link>
                  </td>
                  <td className="admin-table__title">
                    <Link to={`/post/${c.post_slug}`}>{c.post_title}</Link>
                  </td>
                  <td className="admin-table__time">{formatTime(c.created_at)}</td>
                  <td>
                    <button
                      type="button"
                      className="admin-action admin-action--danger"
                      onClick={() => onDelete(c.id)}
                    >
                      删除
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ===== 举报审核 =====
function ReportsView({
  reports,
  totalReports,
  loading,
  error,
  query,
  setQuery,
  onUpdateStatus,
}: {
  reports: AdminReport[]
  totalReports: number
  loading: boolean
  error: string
  query: string
  setQuery: (q: string) => void
  onUpdateStatus: (id: number, status: 'resolved' | 'dismissed') => void
}) {
  return (
    <div className="admin-list-view">
      <AdminToolbar
        placeholder="搜索举报人、目标、理由…"
        query={query}
        setQuery={setQuery}
        countText={`${reports.length} / ${totalReports} 条举报`}
        loading={loading}
      />
      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} />
      ) : reports.length === 0 ? (
        <EmptyState text={query ? '没有匹配的举报' : '暂无举报'} icon="⚑" />
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>举报人</th>
                <th>类型</th>
                <th>目标</th>
                <th>原因</th>
                <th>状态</th>
                <th>时间</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((r) => (
                <tr key={r.id}>
                  <td className="admin-table__author">
                    <Link to={`/${r.reporter_username}`}>@{r.reporter_username}</Link>
                  </td>
                  <td>
                    <span className="admin-tag">{r.target_type}</span>
                  </td>
                  <td className="admin-table__content">{r.target_label || `#${r.target_id}`}</td>
                  <td className="admin-table__content">{r.reason}</td>
                  <td>
                    <span
                      className={`role-badge ${
                        r.status === 'resolved'
                          ? 'role-badge--resolved'
                          : r.status === 'dismissed'
                            ? 'role-badge--dismissed'
                            : 'role-badge--pending'
                      }`}
                    >
                      {r.status === 'resolved' ? '已通过' : r.status === 'dismissed' ? '已驳回' : '待处理'}
                    </span>
                  </td>
                  <td className="admin-table__time">{formatTime(r.created_at)}</td>
                  <td>
                    {r.status === 'pending' ? (
                      <div className="admin-action-group">
                        <button
                          type="button"
                          className="admin-action admin-action--primary"
                          onClick={() => onUpdateStatus(r.id, 'resolved')}
                        >
                          通过
                        </button>
                        <button
                          type="button"
                          className="admin-action admin-action--warn"
                          onClick={() => onUpdateStatus(r.id, 'dismissed')}
                        >
                          驳回
                        </button>
                      </div>
                    ) : (
                      <span className="admin-table__muted">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ===== Bug反馈 =====
function BugsView({
  bugs,
  totalBugs,
  loading,
  error,
  query,
  setQuery,
  onUpdateStatus,
}: {
  bugs: BugReportItem[]
  totalBugs: number
  loading: boolean
  error: string
  query: string
  setQuery: (q: string) => void
  onUpdateStatus: (id: number, status: 'open' | 'in_progress' | 'resolved' | 'closed') => void
}) {
  return (
    <div className="admin-list-view">
      <AdminToolbar
        placeholder="搜索标题、描述、提交者…"
        query={query}
        setQuery={setQuery}
        countText={`${bugs.length} / ${totalBugs} 条反馈`}
        loading={loading}
      />
      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} />
      ) : bugs.length === 0 ? (
        <EmptyState text={query ? '没有匹配的反馈' : '暂无Bug反馈'} icon="🐛" />
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>标题</th>
                <th>类型</th>
                <th>严重程度</th>
                <th>提交者</th>
                <th>状态</th>
                <th>时间</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {bugs.map((b) => (
                <tr key={b.id}>
                  <td className="admin-table__num">#{b.id}</td>
                  <td className="admin-table__title">
                    <details>
                      <summary style={{ cursor: 'pointer' }}>{b.title}</summary>
                      <p style={{ marginTop: 'var(--space-xs)', color: 'var(--ink-soft)', fontSize: '0.85rem', whiteSpace: 'pre-wrap' }}>
                        {b.description}
                      </p>
                      {b.url && (
                        <p style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
                          URL: <a href={b.url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)' }}>{b.url}</a>
                        </p>
                      )}
                      {b.browser && (
                        <p style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                          浏览器: {b.browser.slice(0, 80)}
                        </p>
                      )}
                    </details>
                  </td>
                  <td>
                    <span className={`bug-type-badge bug-type-badge--${b.type}`}>
                      {b.type === 'bug' ? 'Bug' : b.type === 'ui' ? 'UI' : b.type === 'performance' ? '性能' : b.type === 'feature' ? '建议' : '安全'}
                    </span>
                  </td>
                  <td>
                    <span className={`bug-severity-badge bug-severity-badge--${b.severity}`}>
                      {b.severity === 'low' ? '轻微' : b.severity === 'normal' ? '一般' : b.severity === 'high' ? '严重' : '致命'}
                    </span>
                  </td>
                  <td className="admin-table__author">
                    {b.reporter_username ? (
                      <Link to={`/${b.reporter_username}`}>@{b.reporter_username}</Link>
                    ) : (
                      <span className="admin-table__muted">匿名</span>
                    )}
                  </td>
                  <td>
                    <span
                      className={`role-badge ${
                        b.status === 'resolved'
                          ? 'role-badge--resolved'
                          : b.status === 'closed'
                            ? 'role-badge--dismissed'
                            : b.status === 'in_progress'
                              ? 'role-badge--pending'
                              : 'role-badge--pending'
                      }`}
                    >
                      {b.status === 'open' ? '待处理' : b.status === 'in_progress' ? '处理中' : b.status === 'resolved' ? '已修复' : '已关闭'}
                    </span>
                  </td>
                  <td className="admin-table__time">{formatTime(b.created_at)}</td>
                  <td>
                    <select
                      className="admin-select"
                      value={b.status}
                      onChange={(e) => onUpdateStatus(b.id, e.target.value as 'open' | 'in_progress' | 'resolved' | 'closed')}
                    >
                      <option value="open">待处理</option>
                      <option value="in_progress">处理中</option>
                      <option value="resolved">已修复</option>
                      <option value="closed">已关闭</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ===== 站点设置 =====
function SettingsView() {
  const [settings, setSettings] = useState({
    siteName: 'Marginalia',
    siteDesc: '一个慢节奏的随笔社区',
    siteKeywords: '博客,随笔,写作,社区',
    allowRegister: true,
    allowComment: true,
    commentNeedReview: false,
    defaultRole: 'member',
  })

  return (
    <div className="settings-view">
      <div className="settings-section">
        <h3 className="settings-section__title">基本设置</h3>
        <div className="settings-form">
          <div className="settings-item">
            <label className="settings-label">站点名称</label>
            <input
              type="text"
              className="settings-input"
              value={settings.siteName}
              onChange={(e) => setSettings({ ...settings, siteName: e.target.value })}
            />
          </div>
          <div className="settings-item">
            <label className="settings-label">站点描述</label>
            <textarea
              className="settings-textarea"
              value={settings.siteDesc}
              onChange={(e) => setSettings({ ...settings, siteDesc: e.target.value })}
              rows={3}
            />
          </div>
          <div className="settings-item">
            <label className="settings-label">站点关键词</label>
            <input
              type="text"
              className="settings-input"
              value={settings.siteKeywords}
              onChange={(e) => setSettings({ ...settings, siteKeywords: e.target.value })}
            />
            <p className="settings-hint">多个关键词用英文逗号分隔，用于 SEO</p>
          </div>
        </div>
      </div>

      <div className="settings-section">
        <h3 className="settings-section__title">用户设置</h3>
        <div className="settings-form">
          <div className="settings-item settings-item--switch">
            <div>
              <label className="settings-label">开放注册</label>
              <p className="settings-hint">关闭后新用户将无法注册</p>
            </div>
            <label className="switch">
              <input
                type="checkbox"
                checked={settings.allowRegister}
                onChange={(e) => setSettings({ ...settings, allowRegister: e.target.checked })}
              />
              <span className="switch__slider"></span>
            </label>
          </div>
        </div>
      </div>

      <div className="settings-section">
        <h3 className="settings-section__title">评论设置</h3>
        <div className="settings-form">
          <div className="settings-item settings-item--switch">
            <div>
              <label className="settings-label">允许评论</label>
              <p className="settings-hint">关闭后所有文章将禁止评论</p>
            </div>
            <label className="switch">
              <input
                type="checkbox"
                checked={settings.allowComment}
                onChange={(e) => setSettings({ ...settings, allowComment: e.target.checked })}
              />
              <span className="switch__slider"></span>
            </label>
          </div>
          <div className="settings-item settings-item--switch">
            <div>
              <label className="settings-label">评论审核</label>
              <p className="settings-hint">开启后评论需要审核才会显示</p>
            </div>
            <label className="switch">
              <input
                type="checkbox"
                checked={settings.commentNeedReview}
                onChange={(e) => setSettings({ ...settings, commentNeedReview: e.target.checked })}
              />
              <span className="switch__slider"></span>
            </label>
          </div>
        </div>
      </div>

      <div className="settings-actions">
        <button
          type="button"
          className="admin-btn admin-btn--primary"
          onClick={() => alert('设置保存功能开发中')}
        >
          保存设置
        </button>
        <button type="button" className="admin-btn admin-btn--ghost">
          重置为默认
        </button>
      </div>
    </div>
  )
}

// ===== 通用组件 =====
function AdminToolbar({
  placeholder,
  query,
  setQuery,
  countText,
  loading,
}: {
  placeholder: string
  query: string
  setQuery: (q: string) => void
  countText: string
  loading: boolean
}) {
  return (
    <div className="admin-toolbar">
      <div className="admin-search">
        <span className="admin-search__icon">🔍</span>
        <input
          type="text"
          className="admin-search__input"
          placeholder={placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {query && (
          <button
            type="button"
            className="admin-search__clear"
            onClick={() => setQuery('')}
            aria-label="清除搜索"
          >
            ✕
          </button>
        )}
      </div>
      <div className="admin-toolbar__count">{loading ? '加载中…' : countText}</div>
    </div>
  )
}

function LoadingState() {
  return (
    <div className="admin-loading">
      <div className="admin-loading__spinner" />
      <span>加载中…</span>
    </div>
  )
}

function ErrorState({ message }: { message: string }) {
  return <div className="form__error">{message}</div>
}

function EmptyState({ text, icon = '📭', size = 'md' }: { text: string; icon?: string; size?: 'sm' | 'md' }) {
  return (
    <div className={`admin-empty admin-empty--${size}`}>
      <div className="admin-empty__icon">{icon}</div>
      <p className="admin-empty__text">{text}</p>
    </div>
  )
}
