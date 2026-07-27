import { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import type { Post } from '../types';

interface Category {
  name: string;
  count: number;
}

export default function Sidebar({ posts }: { posts: Post[] }) {
  const { user } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    const catMap = new Map<string, number>();
    posts.forEach((post) => {
      const cats = post.category?.split('/').map((c) => c.trim()) || [];
      cats.forEach((c) => {
        if (c) {
          catMap.set(c, (catMap.get(c) || 0) + 1);
        }
      });
    });
    setCategories(Array.from(catMap.entries()).map(([name, count]) => ({ name, count })));
  }, [posts]);

  return (
    <aside className="sidebar">
      <div className="sidebar__profile">
        <div className="sidebar__avatar">
          {user?.avatar ? (
            <img src={user.avatar} alt={user.display_name || user.username} />
          ) : (
            <span className="sidebar__avatar-placeholder">
              {(user?.display_name || user?.username || 'U')[0].toUpperCase()}
            </span>
          )}
        </div>
        <h3 className="sidebar__name">{user?.display_name || user?.username || '访客'}</h3>
        <p className="sidebar__bio">{user?.bio || '热爱技术，热爱生活'}</p>
        <div className="sidebar__social">
          <a href="https://github.com/qiyu666" target="_blank" rel="noopener noreferrer" className="sidebar__social-link" title="GitHub">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
            </svg>
          </a>
          <a href="#" className="sidebar__social-link" title="Twitter">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
            </svg>
          </a>
          <a href="#" className="sidebar__social-link" title="RSS">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
            </svg>
          </a>
          <a href="#" className="sidebar__social-link" title="邮箱">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
            </svg>
          </a>
        </div>
      </div>

      <div className="sidebar__section">
        <h4 className="sidebar__section-title">分类</h4>
        <ul className="sidebar__category-list">
          {categories.map((cat) => (
            <li key={cat.name} className="sidebar__category-item">
              <span className="sidebar__category-name">{cat.name}</span>
              <span className="sidebar__category-count">{cat.count}</span>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
