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
      <h1 className="form-page__title">Write something worth reading.</h1>
      <PostForm onSubmit={handleSubmit} submitLabel="Publish" />
    </div>
  )
}
