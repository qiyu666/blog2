import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import PostForm from '../components/PostForm'
import { getPost, updatePost } from '../api'
import type { Post, PostInput } from '../types'
import { useAuth } from '../auth/AuthContext'

export default function EditPost() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [post, setPost] = useState<Post | null>(null)
  const [loading, setLoading] = useState(true)
  const [forbidden, setForbidden] = useState(false)

  useEffect(() => {
    if (!id) return
    getPost(id)
      .then((data) => {
        setPost(data)
        setLoading(false)
        // 权限检查：作者或管理员才能编辑
        if (user && user.role !== 'admin' && data.author_id !== user.id) {
          setForbidden(true)
        }
      })
      .catch(() => setLoading(false))
  }, [id, user])

  async function handleSubmit(data: PostInput) {
    if (!post) return
    const updated = await updatePost(post.id, data)
    navigate(`/post/${updated.slug}`)
  }

  if (loading) return <div className="loading">加载中</div>
  if (forbidden) return (
    <div className="error-state">
      <h2 className="error-state__title">无权编辑</h2>
      <p className="error-state__msg">你不是这篇文章的作者，无法进行编辑。</p>
      <p>
        <Link to="/" style={{ color: 'var(--accent)' }}>← 返回首页</Link>
      </p>
    </div>
  )
  if (!post) return (
    <div className="error-state">
      <h2 className="error-state__title">未找到帖子</h2>
      <p className="error-state__msg">
        <Link to="/" style={{ color: 'var(--accent)' }}>← 返回论坛</Link>
      </p>
    </div>
  )

  return (
    <div className="form-page">
      <Link to="/" className="back-link">← 取消</Link>
      <h1 className="form-page__title">编辑帖子</h1>
      <PostForm
        editingId={post.id}
        initial={{
          title: post.title,
          excerpt: post.excerpt,
          content: post.content,
          category: post.category,
          tags: post.tags,
          cover_image: post.cover_image,
          published: post.published,
          custom_js: post.custom_js,
        }}
        onSubmit={handleSubmit}
        submitLabel="保存修改"
      />
    </div>
  )
}
