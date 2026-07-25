import { useNavigate } from 'react-router-dom'
import PostForm from '../components/PostForm'
import { createPost } from '../api'
import type { PostInput } from '../types'

export default function NewPost() {
  const navigate = useNavigate()

  async function handleSubmit(data: PostInput) {
    const post = await createPost(data)
    navigate(`/post/${post.slug}`)
  }

  return (
    <div className="form-page">
      <h1 className="form-page__title">写下值得阅读的内容。</h1>
      <PostForm onSubmit={handleSubmit} submitLabel="发布" />
    </div>
  )
}
