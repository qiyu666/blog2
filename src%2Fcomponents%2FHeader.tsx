import { useEffect, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import SearchBar from './SearchBar';
import NotificationsMenu from './NotificationsMenu';

type Theme = 'light' | 'dark';

function getInitialTheme(): Theme {
  try {
    const saved = localStorage.getItem('theme');
    if (saved === 'light' || saved === 'dark') return saved;
  } catch {
    // ignore
  }
  if (
    typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
  ) {
    return 'dark';
  }
  return 'light';
}

function applyTheme(theme: Theme) {
  document.documentElement.setAttribute('data-theme', theme);
}

export default function Header() {
  const { user, logout, unreadCount } = useAuth();
  const navigate = useNavigate();
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof document !== 'undefined') {
      const current = document.documentElement.getAttribute('data-theme');
      if (current === 'light' || current === 'dark') return current;
    }
    return 'light';
  });
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const initial = getInitialTheme();
    applyTheme(initial);
    setTheme(initial);
  }, []);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 12);
    }
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  function toggleTheme() {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    setTheme(next);
    try {
      localStorage.setItem('theme', next);
    } catch {
      // ignore
    }
  }

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <header className={`site-header${scrolled ? ' scrolled' : ''}`}>
      <div className="site-header__inner">
        <Link to="/" className="brand">
          Marginalia<span className="brand__dot">.</span>
        </Link>
        <SearchBar />
        <nav className="nav">
          <NavLink to="/" className="nav__link" end>
            论坛
          </NavLink>
          {user && (
            <NavLink to="/favorites" className="nav__link">
              收藏
            </NavLink>
          )}
          {user && (
            <NavLink to="/drafts" className="nav__link">
              草稿
            </NavLink>
          )}
          {user?.role === 'admin' && (
            <NavLink to="/admin" className="nav__link nav__link--admin">
              后台
            </NavLink>
          )}
          {user ? (
            <>
              <NavLink to="/mailbox" className="nav__link nav__mail">
                站内信
                {unreadCount > 0 && (
                  <span className="nav__badge">{unreadCount}</span>
                )}
              </NavLink>
              <NotificationsMenu />
              <NavLink to="/new" className="nav__write">
                发帖
              </NavLink>
              <div className="nav__user">
                <Link to={`/${user.username}`} className="nav__username">
                  {user.display_name || user.username}
                </Link>
                <button onClick={handleLogout} className="nav__logout">
                  退出
                </button>
              </div>
            </>
          ) : (
            <>
              <Link to="/login" className="nav__link">
                登录
              </Link>
              <Link to="/register" className="nav__write">
                注册
              </Link>
            </>
          )}
          <button
            type="button"
            className="nav__theme-toggle"
            onClick={toggleTheme}
            title={theme === 'dark' ? '切换到亮色模式' : '切换到暗色模式'}
            aria-label="切换主题"
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
        </nav>
      </div>
    </header>
  );
}
