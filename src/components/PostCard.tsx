import { Link } from 'react-router-dom';
import type { Post } from '../types';

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'Z');
  return d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
}

export default function PostCard({ post }: { post: Post }) {
  const author = post.author_username || post.author || '匿名';
  return (
    <article className="post-card fade-up">
      <Link to={`/post/${post.slug}`} className="post-card__image">
        {post.cover_image && (
          <img src={post.cover_image} alt={post.title} loading="lazy" />
        )}
      </Link>
      <span className="post-card__category">{post.category}</span>
      <Link to={`/post/${post.slug}`}>
        <h3 className="post-card__title">{post.title}</h3>
      </Link>
      <p className="post-card__excerpt">{post.excerpt}</p>
      <div className="post-card__meta">
        <Link to={`/u/${author}`} className="post-card__author">@{author}</Link>
        <span>·</span>
        <span>{formatDate(post.created_at)}</span>
        <span className="post-card__stats">
          <span title="点赞">♥ {post.likes_count ?? 0}</span>
          <span title="评论">💬 {post.comments_count ?? 0}</span>
          <span title="浏览">{post.views}</span>
        </span>
      </div>
    </article>
  );
}
