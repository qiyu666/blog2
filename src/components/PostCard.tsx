import { Link } from 'react-router-dom';
import type { Post, SearchResult } from '../types';
import { useReadingHistory } from '../hooks/useReadingHistory';
import { estimateReadingTime } from '../api';

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'Z');
  return d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts
  const min = Math.floor(diff / 60000)
  if (min < 60) return `${min} 分钟前读过`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr} 小时前读过`
  const day = Math.floor(hr / 24)
  if (day < 30) return `${day} 天前读过`
  return '读过'
}

type PostCardData = Post | SearchResult;

function isPost(p: PostCardData): p is Post {
  return (p as Post).content !== undefined;
}

export default function PostCard({ post, index = 0 }: { post: PostCardData; index?: number }) {
  const author = post.author_username || (isPost(post) ? post.author : '') || '匿名';
  const isPinned = isPost(post) ? !!post.is_pinned : false;
  const isFeatured = isPost(post) ? !!post.is_featured : false;
  const readTime = isPost(post) ? estimateReadingTime(post.content) : 5;
  const { history } = useReadingHistory();
  const readItem = history.find((i) => i.slug === post.slug);

  const animationDelay = `${(index % 9) * 0.05 + 0.1}s`;

  return (
    <article
      className={`post-card fade-up${readItem ? ' post-card--read' : ''}`}
      style={{ animationDelay }}
    >
      <Link to={`/post/${post.slug}`} className="post-card__image">
        {post.cover_image && (
          <img src={post.cover_image} alt={post.title} loading="lazy" />
        )}
        {(isPinned || isFeatured) && (
          <div className="post-card__badges">
            {isPinned && <span className="post-badge post-badge--pinned">置顶</span>}
            {isFeatured && <span className="post-badge post-badge--featured">精华</span>}
          </div>
        )}
        {post.has_password && (
          <div className="post-card__lock" title="此文章需要密码访问">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
          </div>
        )}
      </Link>
      <div className="post-card__body">
        <span className="post-card__category">{post.category}</span>
        {readItem && (
          <span className="post-card__read-mark" title={timeAgo(readItem.visited_at)}>
            ✓ 已读{readItem.read_progress ? ` ${readItem.read_progress}%` : ''}
          </span>
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
          <span className="post-card__read-time">约 {readTime} 分钟</span>
          <span className="post-card__stats">
            <span className="post-card__stat" title="点赞">♡ {post.likes_count ?? 0}</span>
            <span className="post-card__stat" title="评论">▭ {post.comments_count ?? 0}</span>
          </span>
        </div>
      </div>
    </article>
  );
}
