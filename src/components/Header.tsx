import { useEffect, useState, useCallback } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../auth/AuthContext';
import SearchBar from './SearchBar';
import SearchPalette from './SearchPalette';
import NotificationsMenu from './NotificationsMenu';
import LanguageSwitcher from './LanguageSwitcher';

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
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof document !== 'undefined') {
      const current = document.documentElement.getAttribute('data-theme');
      if (current === 'light' || current === 'dark') return current;
    }
    return 'light';
  });
  const [scrolled, setScrolled] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  // Ctrl+K / Cmd+K 快捷键打开搜索面板
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen((v) => !v);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const closeSearch = useCallback(() => setSearchOpen(false), []);

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
    <>
    <SearchPalette open={searchOpen} onClose={closeSearch} />
    <header className={`site-header${scrolled ? ' scrolled' : ''}`}>
      <div className="site-header__inner">
        <Link to="/" className="brand">
          Marginalia<span className="brand__dot">.</span>
        </Link>
        <SearchBar />
        <nav className="nav">
          <NavLink to="/" className="nav__link" end>
            {t('nav.forum')}
          </NavLink>
          <NavLink to="/history" className="nav__link">
            {t('nav.history')}
          </NavLink>
          {user && (
            <NavLink to="/favorites" className="nav__link">
              {t('nav.favorites')}
            </NavLink>
          )}
          {user && (
            <NavLink to="/drafts" className="nav__link">
              {t('nav.drafts')}
            </NavLink>
          )}
          {user?.role === 'admin' && (
            <NavLink to="/admin" className="nav__link nav__link--admin">
              {t('nav.admin')}
            </NavLink>
          )}
          {user ? (
            <>
              <NavLink to="/mailbox" className="nav__link nav__mail">
                {t('nav.mailbox')}
                {unreadCount > 0 && (
                  <span className="nav__badge">{unreadCount}</span>
                )}
              </NavLink>
              <NotificationsMenu />
              <NavLink to="/new" className="nav__write">
                {t('nav.newPost')}
              </NavLink>
              <div className="nav__user">
                <Link to={`/${user.username}`} className="nav__username">
                  {user.display_name || user.username}
                </Link>
                <button onClick={handleLogout} className="nav__logout">
                  {t('nav.logout')}
                </button>
              </div>
            </>
          ) : (
            <>
              <Link to="/login" className="nav__link">
                {t('nav.login')}
              </Link>
              <Link to="/register" className="nav__write">
                {t('nav.register')}
              </Link>
            </>
          )}
          <LanguageSwitcher />
          <button
            type="button"
            className="nav__theme-toggle"
            onClick={toggleTheme}
            title={theme === 'dark' ? t('common.toggleLight') : t('common.toggleDark')}
            aria-label={t('common.toggleTheme')}
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
        </nav>
      </div>
    </header>
    </>
  );
}
