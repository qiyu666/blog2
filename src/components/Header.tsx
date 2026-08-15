import { useEffect, useState, useCallback } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../auth/AuthContext';
import SearchBar from './SearchBar';
import SearchPalette from './SearchPalette';
import NotificationsMenu from './NotificationsMenu';
import LanguageSwitcher from './LanguageSwitcher';

type Theme = 'light' | 'dark' | 'auto';

function resolveTheme(theme: Theme): 'light' | 'dark' {
  if (theme === 'auto') {
    if (typeof window !== 'undefined' && window.matchMedia &&
        window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  }
  return theme;
}

function applyTheme(theme: Theme) {
  const resolved = resolveTheme(theme);
  document.documentElement.setAttribute('data-theme', resolved);
}

function getInitialTheme(): Theme {
  try {
    const saved = localStorage.getItem('theme');
    if (saved === 'light' || saved === 'dark' || saved === 'auto') return saved;
  } catch {
    // ignore
  }
  return 'auto';
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

  // auto 模式下：监听系统主题变化，实时切换
  useEffect(() => {
    if (theme !== 'auto') return;
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => applyTheme('auto');
    mql.addEventListener?.('change', onChange);
    return () => mql.removeEventListener?.('change', onChange);
  }, [theme]);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 12);
    }
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  function cycleTheme() {
    const order: Theme[] = ['light', 'dark', 'auto'];
    const next = order[(order.indexOf(theme) + 1) % order.length];
    applyTheme(next);
    setTheme(next);
    try {
      localStorage.setItem('theme', next);
    } catch {
      // ignore
    }
  }

  function getThemeIcon(): string {
    if (theme === 'light') return '☀️';
    if (theme === 'dark') return '🌙';
    return '🖥️';
  }

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const closeMobileMenu = useCallback(() => setMobileMenuOpen(false), []);

  return (
    <>
    <SearchPalette open={searchOpen} onClose={closeSearch} />
    <header className={`site-header${scrolled ? ' scrolled' : ''}`}>
      <div className="site-header__inner">
        <Link to="/" className="brand">
          Marginalia<span className="brand__dot">.</span>
        </Link>
        <SearchBar />
        {/* Desktop nav */}
        <nav className="nav nav--desktop">
          <NavLink to="/" className="nav__link" end>
            {t('nav.forum')}
          </NavLink>
          <NavLink to="/history" className="nav__link">
            {t('nav.history')}
          </NavLink>
          {user && (
            <NavLink to="/following" className="nav__link">
              关注
            </NavLink>
          )}
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
            onClick={cycleTheme}
            title={
              theme === 'light' ? '浅色模式，点击切换到深色' :
              theme === 'dark' ? '深色模式，点击切换到跟随系统' :
              '跟随系统，点击切换到浅色'
            }
            aria-label={t('common.toggleTheme')}
          >
            {getThemeIcon()}
          </button>
        </nav>

        {/* Mobile actions */}
        <div className="nav--mobile-actions">
          <button
            type="button"
            className="nav__theme-toggle"
            onClick={cycleTheme}
            title={
              theme === 'light' ? '浅色 → 深色' :
              theme === 'dark' ? '深色 → 跟随系统' :
              '跟随系统 → 浅色'
            }
            aria-label={t('common.toggleTheme')}
          >
            {getThemeIcon()}
          </button>
          <button
            type="button"
            className="nav__hamburger"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="菜单"
          >
            <span></span>
            <span></span>
            <span></span>
          </button>
        </div>
      </div>
    </header>

    {/* Mobile drawer menu */}
    {mobileMenuOpen && (
      <div className="mobile-menu-overlay" onClick={closeMobileMenu}>
        <div className="mobile-menu" onClick={(e) => e.stopPropagation()}>
          <div className="mobile-menu__header">
            <span className="mobile-menu__brand">Marginalia</span>
            <button
              type="button"
              className="mobile-menu__close"
              onClick={closeMobileMenu}
              aria-label="关闭"
            >
              ×
            </button>
          </div>
          <nav className="mobile-menu__nav" onClick={closeMobileMenu}>
            <NavLink to="/" className="mobile-menu__link" end>
              {t('nav.forum')}
            </NavLink>
            <NavLink to="/history" className="mobile-menu__link">
              {t('nav.history')}
            </NavLink>
            {user && (
              <NavLink to="/following" className="mobile-menu__link">
                关注
              </NavLink>
            )}
            {user && (
              <NavLink to="/favorites" className="mobile-menu__link">
                {t('nav.favorites')}
              </NavLink>
            )}
            {user && (
              <NavLink to="/drafts" className="mobile-menu__link">
                {t('nav.drafts')}
              </NavLink>
            )}
            {user?.role === 'admin' && (
              <NavLink to="/admin" className="mobile-menu__link">
                {t('nav.admin')}
              </NavLink>
            )}
            {user ? (
              <>
                <NavLink to="/mailbox" className="mobile-menu__link">
                  {t('nav.mailbox')}
                  {unreadCount > 0 && (
                    <span className="nav__badge">{unreadCount}</span>
                  )}
                </NavLink>
                <NavLink to="/friends" className="mobile-menu__link">
                  {t('nav.friends')}
                </NavLink>
                <NavLink to="/new" className="mobile-menu__link mobile-menu__link--accent">
                  {t('nav.newPost')}
                </NavLink>
                <NavLink to={`/${user.username}`} className="mobile-menu__link">
                  {user.display_name || user.username}
                </NavLink>
                <button
                  type="button"
                  className="mobile-menu__link mobile-menu__link--btn"
                  onClick={() => { handleLogout(); closeMobileMenu(); }}
                >
                  {t('nav.logout')}
                </button>
              </>
            ) : (
              <>
                <NavLink to="/login" className="mobile-menu__link">
                  {t('nav.login')}
                </NavLink>
                <NavLink to="/register" className="mobile-menu__link mobile-menu__link--accent">
                  {t('nav.register')}
                </NavLink>
              </>
            )}
            <div className="mobile-menu__divider"></div>
            <div className="mobile-menu__lang">
              <LanguageSwitcher />
            </div>
          </nav>
        </div>
      </div>
    )}
    </>
  );
}
