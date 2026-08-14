import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  getAdminUsers,
  getAdminPosts,
  getAdminComments,
  getAdminPendingComments,
  moderateComment,
  getAdminReports,
  updateReportStatus,
  updateUserRole,
  deletePost,
  deleteComment,
  getBugs,
  batchPostAction,
  getAnalytics,
  getAdminCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  exportPosts,
  importPosts,
  type AnalyticsData,
  type AdminUser,
  type AdminPost,
  type AdminComment,
  type AdminReport,
  type BugReportItem,
  type AdminCategory,
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
  | 'calendar'
  | 'reports'
  | 'bugs'
  | 'data'
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
  const [pendingComments, setPendingComments] = useState<AdminComment[]>([])
  const [reports, setReports] = useState<AdminReport[]>([])
  const [bugs, setBugs] = useState<BugReportItem[]>([])
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [categories, setCategories] = useState<AdminCategory[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [postStatus, setPostStatus] = useState<'all' | 'published' | 'draft'>('all')

  // 分类对话框状态
  const [categoryModalOpen, setCategoryModalOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<AdminCategory | null>(null)
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    slug: '',
    description: '',
    icon: '📂',
    sort_order: 0,
  })

  async function load(tab: Tab) {
    setLoading(true)
    setError('')
    setQuery('')
    try {
      if (tab === 'users') setUsers(await getAdminUsers())
      else if (tab === 'posts' || tab === 'tags') setPosts(await getAdminPosts())
      else if (tab === 'categories') {
        const [p, c] = await Promise.all([getAdminPosts(), getAdminCategories()])
        setPosts(p)
        setCategories(c)
      }
      else if (tab === 'comments') {
        const [all, pending] = await Promise.all([
          getAdminComments(),
          getAdminPendingComments(),
        ])
        setComments(all)
        setPendingComments(pending)
      }
      else if (tab === 'bugs') setBugs(await getBugs())
      else if (tab === 'reports') setReports(await getAdminReports())
      else if (tab === 'dashboard') {
        const [u, p, c, b, a, pending] = await Promise.all([
          getAdminUsers(),
          getAdminPosts(),
          getAdminComments(),
          getBugs(),
          getAnalytics(),
          getAdminPendingComments(),
        ])
        setUsers(u)
        setPosts(p)
        setComments(c)
        setBugs(b)
        setAnalytics(a)
        setPendingComments(pending)
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
      setPendingComments((prev) => prev.filter((c) => c.id !== id))
    } catch (err) {
      alert(err instanceof Error ? err.message : '删除失败')
    }
  }

  async function handleModerateComment(id: number, action: 'approve' | 'reject' | 'spam') {
    const label = action === 'approve' ? '通过' : action === 'reject' ? '拒绝' : '标记为垃圾'
    if (!confirm(`确认${label}这条评论？`)) return
    try {
      await moderateComment(id, action)
      setPendingComments((prev) => prev.filter((c) => c.id !== id))
    } catch (err) {
      alert(err instanceof Error ? err.message : '操作失败')
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

  // ===== 分类管理操作 =====
  function openCreateCategory() {
    setEditingCategory(null)
    setCategoryForm({ name: '', slug: '', description: '', icon: '📂', sort_order: 0 })
    setCategoryModalOpen(true)
  }

  function openEditCategory(cat: AdminCategory) {
    setEditingCategory(cat)
    setCategoryForm({
      name: cat.name,
      slug: cat.slug,
      description: cat.description || '',
      icon: cat.icon || '📂',
      sort_order: cat.sort_order || 0,
    })
    setCategoryModalOpen(true)
  }

  function closeCategoryModal() {
    setCategoryModalOpen(false)
    setEditingCategory(null)
  }

  async function handleCategorySubmit() {
    if (!categoryForm.name.trim()) {
      alert('请输入分类名称')
      return
    }
    try {
      if (editingCategory) {
        const updated = await updateCategory(editingCategory.id, categoryForm)
        setCategories((prev) => prev.map((c) => (c.id === updated.id ? updated : c)))
        // 刷新帖子以更新 categoryStats
        setPosts(await getAdminPosts())
      } else {
        const created = await createCategory(categoryForm)
        setCategories((prev) => [...prev, created])
      }
      closeCategoryModal()
    } catch (err) {
      alert(err instanceof Error ? err.message : '操作失败')
    }
  }

  async function handleDeleteCategory(cat: AdminCategory) {
    if (cat.count > 0) {
      if (!confirm(`分类「${cat.name}」下有 ${cat.count} 篇文章，删除后这些文章的分类将变为「General」。确认删除？`)) return
    } else {
      if (!confirm(`确认删除分类「${cat.name}」？`)) return
    }
    try {
      const res = await deleteCategory(cat.id)
      setCategories((prev) => prev.filter((c) => c.id !== cat.id))
      // 刷新帖子以更新 categoryStats
      setPosts(await getAdminPosts())
      alert(`已删除分类「${res.name}」`)
    } catch (err) {
      alert(err instanceof Error ? err.message : '删除失败')
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
      pendingComments: pendingComments.length,
      views: totalViews,
      likes: totalLikes,
      reports: reports.length,
      pendingReports,
      bugs: bugs.length,
      openBugs,
    }
  }, [users, posts, comments, reports, bugs, pendingComments])

  // 分类统计（优先使用后端独立表数据，若为空则回退到从帖子中统计）
  const categoryStats = useMemo(() => {
    if (categories.length > 0) {
      return categories.map((c) => ({
        id: c.id,
        name: c.name,
        count: c.count,
        slug: c.slug,
        description: c.description,
        icon: c.icon,
        sort_order: c.sort_order,
      }))
    }
    const map = new Map<string, number>()
    posts.forEach((p) => {
      const cats = p.category?.split('/').map((c) => c.trim()) || []
      cats.forEach((c) => {
        if (c) map.set(c, (map.get(c) || 0) + 1)
      })
    })
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count, id: 0, slug: '', description: '', icon: '📂', sort_order: 0 }))
      .sort((a, b) => b.count - a.count)
  }, [posts, categories])

  const filteredCategories = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return categoryStats
    return categoryStats.filter((c) => c.name.toLowerCase().includes(q))
  }, [categoryStats, query])

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
        { key: 'data', label: '数据管理', icon: '💾' },
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
    calendar: ['内容管理', '内容日历'],
    reports: ['社区管理', '举报审核'],
    bugs: ['社区管理', 'Bug反馈'],
    data: ['系统设置', '数据管理'],
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
    calendar: { title: '内容日历', desc: '查看每月文章发布情况' },
    reports: { title: '举报审核', desc: '处理用户举报内容' },
    bugs: { title: 'Bug反馈', desc: '处理用户提交的Bug和建议' },
    data: { title: '数据管理', desc: '导出/导入文章数据' },
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
                onClick={openCreateCategory}
              >
                <span>＋</span> 新建分类
              </button>
            )}
          </div>

          {/* 仪表盘 */}
          {activeTab === 'dashboard' && (
            <DashboardView stats={stats} posts={posts} comments={comments} users={users} categoryStats={categoryStats} analytics={analytics} pendingComments={pendingComments} onModerateComment={handleModerateComment} setActiveTab={setActiveTab} />
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
              onEdit={openEditCategory}
              onDelete={handleDeleteCategory}
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
              pendingComments={pendingComments}
              loading={loading}
              error={error}
              query={query}
              setQuery={setQuery}
              onDelete={handleDeleteComment}
              onModerate={handleModerateComment}
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

          {/* 数据管理 */}
          {activeTab === 'data' && (
            <DataView />
          )}

          {/* 站点设置 */}
          {activeTab === 'settings' && (
            <SettingsView />
          )}

          {/* 内容日历 */}
          {activeTab === 'calendar' && (
            <CalendarView posts={posts} />
          )}
        </div>
      </main>

      {/* 移动端底部 Tab Bar */}
      <nav className="admin-mobile-tabs">
        {([
          { key: 'dashboard', icon: '📊', label: '概览' },
          { key: 'posts', icon: '📝', label: '文章' },
          { key: 'users', icon: '👥', label: '用户' },
          { key: 'categories', icon: '📂', label: '分类' },
          { key: 'comments', icon: '💬', label: '评论' },
          { key: 'bugs', icon: '🐛', label: '反馈' },
          { key: 'reports', icon: '🚩', label: '举报' },
          { key: 'settings', icon: '⚙️', label: '设置' },
        ] as { key: Tab; icon: string; label: string }[]).map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={`admin-mobile-tab${activeTab === tab.key ? ' active' : ''}`}
            onClick={() => {
              setActiveTab(tab.key)
              load(tab.key)
            }}
          >
            <span className="admin-mobile-tab__icon">{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </nav>

      {/* 分类编辑对话框 */}
      {categoryModalOpen && (
        <div className="modal-overlay" onClick={closeCategoryModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header">
              <h3 className="modal__title">{editingCategory ? '编辑分类' : '新建分类'}</h3>
              <button type="button" className="modal__close" onClick={closeCategoryModal}>×</button>
            </div>
            <div className="modal__body">
              <div className="form-field">
                <label className="form-field__label">分类名称 *</label>
                <input
                  type="text"
                  className="form-field__input"
                  placeholder="例如：技术、生活、随笔"
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                />
              </div>
              <div className="form-field">
                <label className="form-field__label">Slug（URL友好标识，留空自动生成）</label>
                <input
                  type="text"
                  className="form-field__input"
                  placeholder="例如：tech"
                  value={categoryForm.slug}
                  onChange={(e) => setCategoryForm({ ...categoryForm, slug: e.target.value })}
                />
              </div>
              <div className="form-field">
                <label className="form-field__label">分类图标（Emoji）</label>
                <input
                  type="text"
                  className="form-field__input"
                  placeholder="📂"
                  value={categoryForm.icon}
                  maxLength={10}
                  onChange={(e) => setCategoryForm({ ...categoryForm, icon: e.target.value })}
                />
              </div>
              <div className="form-field">
                <label className="form-field__label">排序（数字越小越靠前）</label>
                <input
                  type="number"
                  className="form-field__input"
                  placeholder="0"
                  value={categoryForm.sort_order}
                  onChange={(e) => setCategoryForm({ ...categoryForm, sort_order: Number(e.target.value) || 0 })}
                />
              </div>
              <div className="form-field">
                <label className="form-field__label">分类描述</label>
                <textarea
                  className="form-field__input"
                  rows={3}
                  placeholder="简要描述这个分类的内容..."
                  value={categoryForm.description}
                  onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                />
              </div>
            </div>
            <div className="modal__footer">
              <button type="button" className="admin-btn admin-btn--ghost" onClick={closeCategoryModal}>
                取消
              </button>
              <button type="button" className="admin-btn admin-btn--primary" onClick={handleCategorySubmit}>
                {editingCategory ? '保存修改' : '创建分类'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ===== 仪表盘 =====
function TrendChart({ data }: { data: Array<{ date: string; posts: number; users: number; comments: number }> }) {
  if (!data || data.length === 0) return null
  const maxValue = Math.max(...data.flatMap((d) => [d.posts, d.users, d.comments]), 1)
  const chartWidth = 600
  const chartHeight = 200
  const barWidth = 18
  const groupWidth = 75
  const axisWidth = 50

  function formatDateLabel(dateStr: string): string {
    const d = new Date(dateStr + 'T00:00:00Z')
    return `${d.getUTCMonth() + 1}/${d.getUTCDate()}`
  }

  return (
    <svg className="trend-chart" viewBox={`0 0 ${chartWidth} ${chartHeight}`} preserveAspectRatio="none">
      {/* 网格线 */}
      {[0, 0.25, 0.5, 0.75, 1].map((p) => (
        <line
          key={p}
          x1={axisWidth}
          x2={chartWidth}
          y1={chartHeight - 20 - p * 150}
          y2={chartHeight - 20 - p * 150}
          stroke="var(--line-soft)"
          strokeWidth="1"
          strokeDasharray={p === 0 ? '0' : '3 3'}
        />
      ))}
      {/* 柱状图 */}
      {data.map((item, i) => {
        const x = axisWidth + 10 + i * groupWidth
        const baseY = chartHeight - 20
        return (
          <g key={item.date} transform={`translate(${x}, 0)`}>
            <rect
              y={baseY - (item.posts / maxValue) * 150}
              height={(item.posts / maxValue) * 150}
              width={barWidth}
              fill="var(--violet)"
              rx="2"
            />
            <rect
              x={barWidth + 3}
              y={baseY - (item.users / maxValue) * 150}
              height={(item.users / maxValue) * 150}
              width={barWidth}
              fill="var(--accent)"
              rx="2"
            />
            <rect
              x={(barWidth + 3) * 2}
              y={baseY - (item.comments / maxValue) * 150}
              height={(item.comments / maxValue) * 150}
              width={barWidth}
              fill="var(--pink)"
              rx="2"
            />
            <text x={barWidth * 1.5} y={chartHeight - 4} textAnchor="middle" className="trend-chart__label">
              {formatDateLabel(item.date)}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

function DashboardView({
  stats,
  posts,
  comments,
  users,
  analytics,
  pendingComments,
  onModerateComment,
  setActiveTab,
}: {
  stats: any
  posts: AdminPost[]
  comments: AdminComment[]
  users: AdminUser[]
  categoryStats: { name: string; count: number }[]
  analytics: AnalyticsData | null
  pendingComments: AdminComment[]
  onModerateComment: (id: number, action: 'approve' | 'reject' | 'spam') => void
  setActiveTab: (tab: Tab) => void
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
            className={`stat-card stat-card--${card.color.includes('accent') ? 'accent' : card.color.includes('violet') ? 'violet' : card.color.includes('pink') ? 'pink' : 'cyan'}`}
            style={{ '--stat-color': card.color } as React.CSSProperties}
          >
            <div className={`stat-card__icon${card.icon === '💬' && stats.pendingComments > 0 ? ' stat-card__icon--pulse' : ''}`}>{card.icon}</div>
            <div className="stat-card__body">
              <div className="stat-card__value">{card.value}</div>
              <div className="stat-card__label">{card.label}</div>
            </div>
            <div className="stat-card__trend">{card.change}</div>
          </div>
        ))}
      </div>

      {/* 快捷操作 + 待处理通知 */}
      <div className="dashboard__top">
        <div>
          <div className="chart-card" style={{ marginBottom: 'var(--space-lg)' }}>
            <div className="chart-card__header">
              <h3 className="chart-card__title">快捷操作</h3>
            </div>
            <div className="chart-card__body">
              <div className="quick-actions">
                <Link to="/new" className="quick-action">
                  <span className="quick-action__icon">✍️</span>
                  <span className="quick-action__label">写新文章</span>
                </Link>
                <button type="button" className="quick-action" onClick={() => setActiveTab('comments')}>
                  <span className="quick-action__icon">💬</span>
                  <span className="quick-action__label">审核评论</span>
                  {pendingComments.length > 0 && (
                    <span className="quick-action__count">{pendingComments.length} 待审</span>
                  )}
                </button>
                <button type="button" className="quick-action" onClick={() => setActiveTab('bugs')}>
                  <span className="quick-action__icon">🐛</span>
                  <span className="quick-action__label">处理反馈</span>
                  {stats.openBugs > 0 && (
                    <span className="quick-action__count">{stats.openBugs} 待处理</span>
                  )}
                </button>
                <button type="button" className="quick-action" onClick={() => setActiveTab('reports')}>
                  <span className="quick-action__icon">⚑</span>
                  <span className="quick-action__label">举报审核</span>
                  {stats.pendingReports > 0 && (
                    <span className="quick-action__count">{stats.pendingReports} 待处理</span>
                  )}
                </button>
                <Link to="/analytics" className="quick-action">
                  <span className="quick-action__icon">📊</span>
                  <span className="quick-action__label">数据分析</span>
                </Link>
                <Link to="/settings" className="quick-action">
                  <span className="quick-action__icon">⚙️</span>
                  <span className="quick-action__label">站点设置</span>
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div>
          {pendingComments.length > 0 || stats.pendingReports > 0 || stats.openBugs > 0 ? (
            <div className="pending-panel">
              <div className="pending-panel__header">
                <h3 className="pending-panel__title">
                  待处理 <span className="pending-panel__badge">{pendingComments.length + stats.pendingReports + stats.openBugs}</span>
                </h3>
                <button type="button" className="recent-card__more" onClick={() => setActiveTab('comments')}>查看全部 →</button>
              </div>
              <div className="pending-panel__body">
                {pendingComments.slice(0, 3).map((c) => (
                  <div key={c.id} className="pending-item">
                    <div className="pending-item__info">
                      <div className="pending-item__label">📝 评论待审</div>
                      <div className="pending-item__meta">
                        @{c.author_username} <span className="pending-item__dot">·</span> {formatTime(c.created_at)}
                      </div>
                    </div>
                    <div className="pending-item__actions">
                      <button className="pending-item__btn pending-item__btn--approve" onClick={() => onModerateComment(c.id, 'approve')}>✓</button>
                      <button className="pending-item__btn pending-item__btn--reject" onClick={() => onModerateComment(c.id, 'reject')}>✕</button>
                    </div>
                  </div>
                ))}
                {stats.pendingReports > 0 && (
                  <div className="pending-item">
                    <div className="pending-item__info">
                      <div className="pending-item__label">⚑ {stats.pendingReports} 条举报待处理</div>
                      <div className="pending-item__meta">点击前往审核</div>
                    </div>
                    <button className="pending-item__btn pending-item__btn--approve" onClick={() => setActiveTab('reports')}>查看</button>
                  </div>
                )}
                {stats.openBugs > 0 && (
                  <div className="pending-item">
                    <div className="pending-item__info">
                      <div className="pending-item__label">🐛 {stats.openBugs} 个 Bug 待处理</div>
                      <div className="pending-item__meta">点击前往处理</div>
                    </div>
                    <button className="pending-item__btn pending-item__btn--approve" onClick={() => setActiveTab('bugs')}>查看</button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="pending-panel">
              <div className="pending-panel__header" style={{ background: 'linear-gradient(180deg, rgba(34,197,94,0.06) 0%, transparent 100%)' }}>
                <h3 className="pending-panel__title">
                  一切正常 <span className="pending-panel__badge" style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)' }}>✓</span>
                </h3>
              </div>
              <div className="pending-panel__body" style={{ padding: 'var(--space-lg)', textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', marginBottom: 'var(--space-xs)' }}>🎊</div>
                <div style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>暂无待处理事项</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 图表 + 最新动态 */}
      <div className="dashboard__bottom">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
          {/* 图表区域 */}
          <div className="chart-card">
            <div className="chart-card__header">
              <h3 className="chart-card__title">近 7 天访问趋势</h3>
              <div className="chart-card__tabs">
                <span className="chart-card__legend">文章 / 用户 / 评论</span>
              </div>
            </div>
            <div className="chart-card__body">
              {analytics?.trends7d && analytics.trends7d.length > 0 ? (
                <TrendChart data={analytics.trends7d} />
              ) : (
                <div className="chart-placeholder">
                  <div className="chart-placeholder__text">暂无数据</div>
                </div>
              )}
            </div>
          </div>

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
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
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
                        <span className="recent-item__dot">·</span>
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
                        <img src={u.avatar} alt="" className="recent-item__avatar" loading="lazy" />
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
                        <img src={u.avatar} alt="" className="admin-user-cell__avatar" loading="lazy" />
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
type CategoryItem = {
  id?: number
  name: string
  count: number
  slug?: string
  description?: string
  icon?: string
  sort_order?: number
}

function CategoriesView({
  categories,
  totalCategories,
  loading,
  error,
  query,
  setQuery,
  onEdit,
  onDelete,
}: {
  categories: CategoryItem[]
  totalCategories: number
  loading: boolean
  error: string
  query: string
  setQuery: (q: string) => void
  onEdit: (cat: CategoryItem & AdminCategory) => void
  onDelete: (cat: CategoryItem & AdminCategory) => void
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
            <div key={c.id || i} className="category-card">
              <div className="category-card__icon">{c.icon || '📂'}</div>
              <div className="category-card__body">
                <div className="category-card__name">{c.name}</div>
                <div className="category-card__count">{c.count} 篇文章</div>
                {c.description && (
                  <div className="category-card__desc" title={c.description}>
                    {c.description.length > 40 ? c.description.slice(0, 40) + '...' : c.description}
                  </div>
                )}
              </div>
              <div className="category-card__actions">
                <button
                  type="button"
                  className="admin-btn admin-btn--sm"
                  disabled={!c.id}
                  onClick={() => c.id && onEdit(c as AdminCategory)}
                >
                  编辑
                </button>
                <button
                  type="button"
                  className="admin-btn admin-btn--sm admin-btn--danger-outline"
                  disabled={!c.id}
                  onClick={() => c.id && onDelete(c as AdminCategory)}
                >
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
  pendingComments,
  loading,
  error,
  query,
  setQuery,
  onDelete,
  onModerate,
}: {
  comments: AdminComment[]
  totalComments: number
  pendingComments: AdminComment[]
  loading: boolean
  error: string
  query: string
  setQuery: (q: string) => void
  onDelete: (id: number) => void
  onModerate: (id: number, action: 'approve' | 'reject' | 'spam') => void
}) {
  return (
    <div className="admin-list-view">
      {/* 待审核队列 */}
      {pendingComments.length > 0 && (
        <div className="admin-section" style={{ marginBottom: 'var(--space-md)' }}>
          <div className="admin-section__header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-xs)' }}>
            <h3 className="admin-section__title" style={{ margin: 0, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
              <span>🟡 待审核评论</span>
              <span className="admin-sidebar__item-count" style={{ background: 'var(--gold, #f59e0b)' }}>
                {pendingComments.length}
              </span>
            </h3>
          </div>
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
                {pendingComments.map((c) => (
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
                      <div className="admin-action-group">
                        <button
                          type="button"
                          className="admin-action admin-action--primary"
                          onClick={() => onModerate(c.id, 'approve')}
                        >
                          通过
                        </button>
                        <button
                          type="button"
                          className="admin-action admin-action--warn"
                          onClick={() => onModerate(c.id, 'reject')}
                        >
                          拒绝
                        </button>
                        <button
                          type="button"
                          className="admin-action admin-action--danger"
                          onClick={() => onModerate(c.id, 'spam')}
                        >
                          标记垃圾
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

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

// ===== 数据管理 =====
function DataView() {
  const [busy, setBusy] = useState<'export-json' | 'export-md' | 'import' | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  async function handleExportJson() {
    setBusy('export-json')
    setMessage(null)
    try {
      await exportPosts('json')
      setMessage({ type: 'success', text: 'JSON 导出已开始下载' })
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : '导出失败' })
    } finally {
      setBusy(null)
    }
  }

  async function handleExportMarkdown() {
    setBusy('export-md')
    setMessage(null)
    try {
      await exportPosts('markdown')
      setMessage({ type: 'success', text: 'Markdown 导出已开始下载' })
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : '导出失败' })
    } finally {
      setBusy(null)
    }
  }

  async function handleImportFile(file: File) {
    if (!file.name.toLowerCase().endsWith('.json')) {
      setMessage({ type: 'error', text: '请选择 .json 文件' })
      return
    }
    setBusy('import')
    setMessage(null)
    try {
      const text = await file.text()
      let data: unknown
      try {
        data = JSON.parse(text)
      } catch {
        throw new Error('JSON 解析失败，文件格式不正确')
      }
      const result = await importPosts(data)
      setMessage({
        type: 'success',
        text: `导入完成：成功 ${result.imported} 篇，跳过 ${result.skipped} 篇（共 ${result.total} 篇）${
          result.errors && result.errors.length > 0 ? `；${result.errors.length} 条错误` : ''
        }`,
      })
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : '导入失败' })
    } finally {
      setBusy(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <div className="settings-view">
      <div className="settings-section">
        <h3 className="settings-section__title">导出文章</h3>
        <p className="settings-hint" style={{ marginBottom: 'var(--space-sm)' }}>
          将所有文章导出为本地文件，用于备份或迁移。
        </p>
        <div className="settings-form">
          <div className="settings-item">
            <label className="settings-label">JSON 格式</label>
            <p className="settings-hint">包含全部字段（标题、内容、标签、时间等），适合完整备份</p>
            <button
              type="button"
              className="admin-btn admin-btn--primary"
              onClick={handleExportJson}
              disabled={busy !== null}
            >
              {busy === 'export-json' ? '导出中…' : '⬇ 导出文章 (JSON)'}
            </button>
          </div>
          <div className="settings-item">
            <label className="settings-label">Markdown 格式</label>
            <p className="settings-hint">每篇文章以 YAML frontmatter 开头，适合在其它 Markdown 工具中阅读</p>
            <button
              type="button"
              className="admin-btn admin-btn--primary"
              onClick={handleExportMarkdown}
              disabled={busy !== null}
            >
              {busy === 'export-md' ? '导出中…' : '⬇ 导出文章 (Markdown)'}
            </button>
          </div>
        </div>
      </div>

      <div className="settings-section">
        <h3 className="settings-section__title">导入文章</h3>
        <p className="settings-hint" style={{ marginBottom: 'var(--space-sm)' }}>
          上传 JSON 文件导入文章。已存在相同 slug 的文章会自动跳过。
        </p>
        <div className="settings-form">
          <div className="settings-item">
            <label className="settings-label">选择 JSON 文件</label>
            <p className="settings-hint">支持数组格式 <code>[&#123;...&#125;]</code> 或 <code>&#123;"posts": [...]&#125;</code></p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              style={{ display: 'none' }}
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) handleImportFile(f)
              }}
            />
            <button
              type="button"
              className="admin-btn admin-btn--primary"
              onClick={() => fileInputRef.current?.click()}
              disabled={busy !== null}
            >
              {busy === 'import' ? '导入中…' : '⬆ 导入文章'}
            </button>
          </div>
        </div>
      </div>

      {message && (
        <div
          className={`form__${message.type === 'success' ? 'success' : 'error'}`}
          style={{
            padding: 'var(--space-sm) var(--space-md)',
            background:
              message.type === 'success'
                ? 'rgba(34, 197, 94, 0.1)'
                : 'rgba(239, 68, 68, 0.1)',
            border: `1px solid ${
              message.type === 'success' ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'
            }`,
            borderRadius: '8px',
          }}
        >
          {message.text}
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

// ===== 内容日历 =====
function CalendarView({ posts }: { posts: AdminPost[] }) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  const postDates = useMemo(() => {
    const map = new Map<string, number>()
    posts.forEach((p) => {
      const d = new Date(p.created_at + 'Z')
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      map.set(key, (map.get(key) || 0) + 1)
    })
    return map
  }, [posts])

  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startOffset = (firstDay.getDay() + 6) % 7
  const daysInMonth = lastDay.getDate()
  const today = new Date()
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1))
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1))

  const monthLabel = `${year}年${month + 1}月`

  return (
    <div className="settings-view">
      <div className="admin-calendar-nav">
        <button className="admin-calendar-nav__btn" onClick={prevMonth}>← 上月</button>
        <span className="admin-calendar-nav__title">{monthLabel}</span>
        <button className="admin-calendar-nav__btn" onClick={nextMonth}>下月 →</button>
      </div>
      <div className="admin-calendar-header">
        {['日', '一', '二', '三', '四', '五', '六'].map((d) => (
          <div key={d} className="admin-calendar-header-cell">{d}</div>
        ))}
      </div>
      <div className="admin-calendar-grid">
        {Array.from({ length: startOffset }, (_, i) => (
          <div key={`empty-${i}`} className="admin-calendar-cell" style={{ opacity: 0.3 }} />
        ))}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const day = i + 1
          const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          const count = postDates.get(key) ?? 0
          const isToday = key === todayKey
          return (
            <div
              key={key}
              className={`admin-calendar-cell${isToday ? ' today' : ''}${count > 0 ? ' has-post' : ''}`}
              title={count > 0 ? `${count} 篇文章` : ''}
            >
              {day}
              {count > 0 && (
                <span style={{ fontSize: '0.65rem', color: 'var(--muted)', marginTop: 2 }}>{count}</span>
              )}
            </div>
          )
        })}
      </div>
      <div style={{ marginTop: 'var(--space-md)', display: 'flex', gap: 'var(--space-md)', fontSize: '0.82rem', color: 'var(--muted)' }}>
        <span><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)', marginRight: 4 }} />今天</span>
        <span><span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', marginRight: 4 }} />有发布</span>
        <span>共 {posts.length} 篇文章</span>
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
