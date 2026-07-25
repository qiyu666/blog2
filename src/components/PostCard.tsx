import { Link } from 'react-router-dom'
import type { Post } from '../types'

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'Z')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function PostCard({ post }: { post: Post }) {
  return (
    <article className="post-card fade-up">
      <Link to={`/post/${post.slug}`} className="post-card__image">
        {post.cover_image && <img src={post.cover_image} alt={post.title} loading="lazy" />}
      </Link>
      <span className="post-card__category">{post.category}</span>
      <Link to={`/post/${post.slug}`}>
        <h3 className="post-card__title">{post.title}</h3>
      </Link>
      <p className="post-card__excerpt">{post.excerpt}</p>
      <div className="post-card__meta">
        <span className="post-card__author">{post.author}</span>
        <span>·</span>
        <span>{formatDate(post.created_at)}</span>
      </div>
    </article>
  )
}
