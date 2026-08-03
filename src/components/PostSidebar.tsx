import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import type { Post } from '../types';
import { getPosts, getUserProfile } from '../api';

interface PostSidebarProps {
  post: Post;
}

export default function PostSidebar({ post }: PostSidebarProps) {
  const [authorPosts, setAuthorPosts] = useState<Post[]>([]);
  const [authorBio, setAuthorBio] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!post.author_username) {
      setLoading(false);
      return;
    }
    Promise.all([
      getPosts().then((posts) =>
        posts.filter((p) => p.author_username === post.author_username && p.id !== post.id).slice(0, 5)
      ),
      getUserProfile(post.author_username)
        .then((profile) => profile.user.bio)
        .catch(() => ''),
    ])
      .then(([posts, bio]) => {
        setAuthorPosts(posts);
        setAuthorBio(bio);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, [post.author_username, post.id]);

  const author = post.author_username || '匿名';
  const authorName = post.author_username || '匿名';
  const authorAvatar = post.author_avatar || '';

  const tags = post.tags
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);

  return (
    <aside className="post-sidebar">
      {/* 作者信息卡片 */}
      <div className="post-sidebar__card">
        <div className="post-sidebar__author">
          <Link to={`/${author}`} className="post-sidebar__avatar">
            {authorAvatar ? (
              <img src={authorAvatar} alt={authorName} />
            ) : (
              <span className="post-sidebar__avatar-fallback">
                {authorName.charAt(0).toUpperCase()}
              </span>
            )}
          </Link>
          <div className="post-sidebar__author-info">
            <Link to={`/${author}`} className="post-sidebar__author-name">
              {authorName}
            </Link>
            <span className="post-sidebar__author-handle">@{author}</span>
          </div>
        </div>
        <p className="post-sidebar__bio">
          {authorBio || '热爱技术，热爱生活，记录思考与成长。'}
        </p>
        <div className="post-sidebar__stats">
          <div className="post-sidebar__stat">
            <span className="post-sidebar__stat-num">{authorPosts.length + 1}</span>
            <span className="post-sidebar__stat-label">篇文章</span>
          </div>
          <div className="post-sidebar__stat">
            <span className="post-sidebar__stat-num">{post.views}</span>
            <span className="post-sidebar__stat-label">次浏览</span>
          </div>
        </div>
      </div>

      {/* 标签 */}
      {tags.length > 0 && (
        <div className="post-sidebar__card">
          <h4 className="post-sidebar__title">标签</h4>
          <div className="post-sidebar__tags">
            {tags.map((tag) => (
              <Link
                key={tag}
                to={`/tag/${encodeURIComponent(tag)}`}
                className="post-sidebar__tag"
              >
                #{tag}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* 更多来自该作者 */}
      <div className="post-sidebar__card">
        <h4 className="post-sidebar__title">更多来自 {authorName}</h4>
        {loading ? (
          <div className="post-sidebar__loading">加载中...</div>
        ) : authorPosts.length > 0 ? (
          <ul className="post-sidebar__posts">
            {authorPosts.map((p) => (
              <li key={p.id} className="post-sidebar__post-item">
                <Link to={`/post/${p.slug}`} className="post-sidebar__post-link">
                  <span className="post-sidebar__post-title">{p.title}</span>
                  <span className="post-sidebar__post-date">
                    {new Date(p.created_at + 'Z').toLocaleDateString('zh-CN', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="post-sidebar__empty">暂无更多文章</p>
        )}
      </div>

      {/* 分享 */}
      <div className="post-sidebar__card">
        <h4 className="post-sidebar__title">分享</h4>
        <div className="post-sidebar__share">
          <button
            type="button"
            className="post-sidebar__share-btn"
            title="复制链接"
            onClick={() => {
              navigator.clipboard?.writeText(window.location.href);
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
            </svg>
            复制链接
          </button>
        </div>
      </div>
    </aside>
  );
}
