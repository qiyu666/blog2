import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export default function Header() {
  const { user, logout, unreadCount } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <header className="site-header">
      <div className="site-header__inner">
        <Link to="/" className="brand">
          Marginalia<span className="brand__dot">.</span>
        </Link>
        <nav className="nav">
          <NavLink to="/" className="nav__link" end>
            论坛
          </NavLink>
          {user && (
            <NavLink to="/favorites" className="nav__link">
              收藏
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
              <NavLink to="/new" className="nav__write">
                发帖
              </NavLink>
              <div className="nav__user">
                <span className="nav__username">{user.username}</span>
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
        </nav>
      </div>
    </header>
  );
}
