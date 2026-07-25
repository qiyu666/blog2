import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import PostForm from '../components/PostForm'
import { updatePost } from '../api'
import type { Post, PostInput } from '../types'

export default function EditPost() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [post, setPost] = useState<Post | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    // Fetch all posts and find by id (since our API gets by slug, not id)
    fetch('/api/posts')
      .then(res => res.json())
      .then((posts: Post[]) => {
        const found = posts.find(p => p.id === Number(id))
        setPost(found || null)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [id])

  async function handleSubmit(data: PostInput) {
    if (!post) return
    const updated = await updatePost(post.id, data)
    navigate(`/post/${updated.slug}`)
  }

  if (loading) return <div className="loading">Loading editor</div>
  if (!post) return (
    <div className="error-state">
      <h2 className="error-state__title">Post not found</h2>
      <p className="error-state__msg">
        <Link to="/" style={{ color: 'var(--accent)' }}>← Back to the journal</Link>
      </p>
    </div>
  )

  return (
    <div className="form-page">
      <Link to="/" className="back-link">← Cancel</Link>
      <h1 className="form-page__title">Revise your work.</h1>
      <PostForm
        initial={{
          title: post.title,
          excerpt: post.excerpt,
          content: post.content,
          author: post.author,
          category: post.category,
          tags: post.tags,
          cover_image: post.cover_image,
        }}
        onSubmit={handleSubmit}
        submitLabel="Save Changes"
      />
    </div>
  )
}
