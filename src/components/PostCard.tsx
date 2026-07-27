import { Link } from 'react-router-dom';
import type { Post, SearchResult } from '../types';

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'Z');
  return d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
}

function estimateReadTime(text: string): number {
  const wordsPerMinute = 200;
  const wordCount = text.split(/\s+/).length;
  return Math.max(1, Math.ceil(wordCount / wordsPerMinute));
}

type PostCardData = Post | SearchResult;

function isPost(p: PostCardData): p is Post {
  return (p as Post).content !== undefined;
}

export default function PostCard({ post, index = 0 }: { post: PostCardData; index?: number }) {
  const author = post.author_username || (isPost(post) ? post.author : '') || '匿名';
  const isPinned = isPost(post) ? !!post.is_pinned : false;
  const isFeatured = isPost(post) ? !!post.is_featured : false;
  const readTime = isPost(post) ? estimateReadTime(post.content) : 5;

  const animationDelay = `${(index % 9) * 0.05 + 0.1}s`;

  return (
    <article
      className="post-card fade-up"
      style={{ animationDelay }}
    >
      <Link to={`/post/${post.slug}`} className="post-card__image">
        {post.cover_image && (
          <img src={post.cover_image} alt={post.title} loading="lazy" />
        )}
      </Link>
      <span className="post-card__category">{post.category}</span>
      {(isPinned || isFeatured) && (
        <div className="post-card__badges">
          {isPinned && <span className="post-badge post-badge--pinned">置顶</span>}
          {isFeatured && <span className="post-badge post-badge--featured">精华</span>}
        </div>
      )}
      <h3 className="post-card__title">
        <Link to={`/post/${post.slug}`}>{post.title}</Link>
      </h3>
      <p className="post-card__excerpt">{post.excerpt}</p>
      <div className="post-card__meta">
        <Link to={`/${author}`} className="post-card__author">{author}</Link>
        <span className="post-card__divider"></span>
        <span>{formatDate(post.created_at)}</span>
        <span className="post-card__divider"></span>
        <span className="post-card__read-time">{readTime} 分钟</span>
        <span className="post-card__stats">
          <span className="post-card__stat" title="点赞">♡ {post.likes_count ?? 0}</span>
          <span className="post-card__stat" title="评论">▭ {post.comments_count ?? 0}</span>
        </span>
      </div>
    </article>
  );
}
