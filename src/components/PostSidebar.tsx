import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import type { Post } from '../types';
import { getPosts, getUserProfile } from '../api';
import SocialLinks from './SocialLinks';

interface PostSidebarProps {
  post: Post;
}

export default function PostSidebar({ post }: PostSidebarProps) {
  const [authorPosts, setAuthorPosts] = useState<Post[]>([]);
  const [authorBio, setAuthorBio] = useState('');
  const [authorSocial, setAuthorSocial] = useState<{
    social_github?: string;
    social_twitter?: string;
    social_qq?: string;
    social_wechat?: string;
    social_telegram?: string;
    social_bilibili?: string;
    social_email?: string;
    social_facebook?: string;
    social_whatsapp?: string;
  } | null>(null);
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
        .then((profile) => {
          setAuthorBio(profile.user.bio || '');
          setAuthorSocial({
            social_github: profile.user.social_github,
            social_twitter: profile.user.social_twitter,
            social_qq: profile.user.social_qq,
            social_wechat: profile.user.social_wechat,
            social_telegram: profile.user.social_telegram,
            social_bilibili: profile.user.social_bilibili,
            social_email: profile.user.social_email,
            social_facebook: profile.user.social_facebook,
            social_whatsapp: profile.user.social_whatsapp,
          });
        })
        .catch(() => ''),
    ])
      .then(([posts]) => {
        setAuthorPosts(posts);
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
        {authorSocial && (
          <div className="post-sidebar__social">
            <SocialLinks user={authorSocial} size="sm" />
          </div>
        )}
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
            onClick={(e) => {
              navigator.clipboard?.writeText(window.location.href);
              const btn = e.currentTarget;
              const label = btn.querySelector('.share-label');
              if (label) {
                const orig = label.textContent;
                label.textContent = '已复制！';
                setTimeout(() => { label.textContent = orig; }, 2000);
              }
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
            </svg>
            <span className="share-label">复制链接</span>
          </button>
          <button
            type="button"
            className="post-sidebar__share-btn"
            title="分享到微博"
            onClick={() => {
              const text = encodeURIComponent(document.title);
              const url = encodeURIComponent(window.location.href);
              window.open(`https://service.weibo.com/share/share.php?title=${text}&url=${url}`, '_blank', 'width=600,height=500');
            }}
          >
            <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
              <path d="M10.098 20.323c-3.977.391-7.414-1.406-7.672-4.02-.259-2.609 2.759-5.047 6.74-5.441 3.979-.394 7.413 1.404 7.671 4.018.259 2.6-2.759 5.049-6.739 5.443zM9.05 17.219c-.384.616-1.208.884-1.829.602-.612-.279-.793-.991-.406-1.593.379-.595 1.176-.861 1.793-.601.624.267.82.973.442 1.592zm1.27-1.627c-.141.237-.449.353-.689.253-.236-.09-.313-.361-.177-.586.138-.227.436-.346.672-.24.239.09.315.36.18.573zm1.895-1.253c-.5-.154-1.187.075-1.462.503-.281.435-.108.965.398 1.12.515.159 1.123-.075 1.391-.51.266-.435.079-.962-.327-1.113zm5.044-2.291c-.043-.065-.131-.092-.275-.082l-2.571.176-.014-3.358c0-.116-.053-.215-.183-.215h-1.001c-.087 0-.157.029-.211.087-.053.058-.08.13-.08.215v3.886c0 .146.049.258.146.336.097.078.221.112.372.103l3.398-.232c.201-.014.293-.094.249-.24l.17-.396zm1.583-5.782c-.745-.331-1.547-.503-2.396-.503-.227 0-.448.014-.667.039-.181-.317-.408-.624-.68-.917-1.098-1.181-2.625-1.793-4.352-1.793-1.726 0-3.253.612-4.351 1.793-.273.293-.5.6-.68.917-.219-.025-.44-.039-.667-.039-.849 0-1.651.172-2.396.503-1.826.812-2.938 2.492-2.938 4.372 0 .834.225 1.616.648 2.293.183.293.395.566.631.815.379.399.816.734 1.301.997.485.263 1.018.454 1.587.567.284.057.575.09.871.098.045.003.09.003.135.003.045 0 .09 0 .135-.003.296-.008.587-.041.871-.098.569-.113 1.102-.304 1.587-.567.485-.263.922-.598 1.301-.997.236-.249.448-.522.631-.815.423-.677.648-1.459.648-2.293 0-.078-.002-.156-.005-.234.099-.064.197-.132.293-.204.462-.346.881-.749 1.247-1.196.366-.447.679-.94.929-1.468.155-.329.283-.67.382-1.019.149-.525.225-1.072.225-1.629 0-.078-.002-.156-.005-.234.099-.064.197-.132.293-.204.462-.346.881-.749 1.247-1.196.366-.447.679-.94.929-1.468.155-.329.283-.67.382-1.019.149-.525.225-1.072.225-1.629 0-.834-.225-1.616-.648-2.293-.183-.293-.395-.566-.631-.815-.379-.399-.816-.734-1.301-.997-.485-.263-1.018-.454-1.587-.567-.284-.057-.575-.09-.871-.098-.045-.003-.09-.003-.135-.003-.045 0-.09 0-.135.003-.296.008-.587.041-.871.098-.569.113-1.102.304-1.587.567-.485.263-.922.598-1.301.997-.236.249-.448.522-.631.815-.423.677-.648 1.459-.648 2.293 0 .078.002.156.005.234-.099.064-.197.132-.293.204-.462.346-.881.749-1.247 1.196-.366.447-.679.94-.929 1.468-.155.329-.283.67-.382 1.019-.149.525-.225 1.072-.225 1.629 0 .078.002.156.005.234z"/>
            </svg>
            <span className="share-label">微博</span>
          </button>
          <button
            type="button"
            className="post-sidebar__share-btn"
            title="分享到 Twitter"
            onClick={() => {
              const text = encodeURIComponent(document.title);
              const url = encodeURIComponent(window.location.href);
              window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank', 'width=600,height=500');
            }}
          >
            <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
            </svg>
            <span className="share-label">Twitter</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
