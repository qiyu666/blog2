import { useNavigate } from 'react-router-dom'
import PostForm from '../components/PostForm'
import { createPost } from '../api'
import type { PostInput } from '../types'

export default function NewPost() {
  const navigate = useNavigate()

  async function handlePublish(data: PostInput) {
    const post = await createPost({ ...data, published: 1 })
    navigate(`/post/${post.slug}`)
  }

  async function handleSaveDraft(data: PostInput) {
    await createPost({ ...data, published: 0 })
    navigate('/drafts')
  }

  return (
    <div className="editor-page">
      <div className="editor-page__inner">
        <PostForm
          onPublish={handlePublish}
          onSaveDraft={handleSaveDraft}
          mode="new"
        />
      </div>
    </div>
  )
}
