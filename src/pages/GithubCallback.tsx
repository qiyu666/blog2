import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export default function GithubCallback() {
  const navigate = useNavigate();
  const { refreshUser, user } = useAuth();
  const [status, setStatus] = useState('正在验证登录状态…');

  useEffect(() => {
    let active = true;
    refreshUser()
      .then(() => {
        if (!active) return;
        if (user?.password_hash === '') {
          setStatus('新用户，正在跳转至设置页面…');
          setTimeout(() => {
            navigate('/oauth-setup', { replace: true });
          }, 500);
        } else {
          setStatus('登录成功，正在跳转…');
          setTimeout(() => {
            navigate('/', { replace: true });
          }, 500);
        }
      })
      .catch((err) => {
        if (!active) return;
        setStatus('登录验证失败：' + (err instanceof Error ? err.message : String(err)));
      });
    return () => {
      active = false;
    };
  }, [navigate, refreshUser, user]);

  return (
    <div className="auth-page">
      <div className="auth-page__card">
        <div className="auth-page__brand">
          <span className="auth-page__logo">M</span>
          <span className="auth-page__brand-name">Marginalia</span>
        </div>
        <p className="auth-page__subtitle" style={{ marginTop: 'var(--space-lg)' }}>
          {status}
        </p>
        {user && (
          <p className="auth-page__subtitle" style={{ marginTop: 'var(--space-sm)', color: 'var(--sage)' }}>
            已登录为：{user.display_name || user.username}
          </p>
        )}
      </div>
    </div>
  );
}
