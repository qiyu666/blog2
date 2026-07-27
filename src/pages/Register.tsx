import { useState, FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { startGithubAuth } from '../api';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const redirect = params.get('redirect') || '/';

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (password !== confirm) {
      setError('两次输入的密码不一致');
      return;
    }
    setLoading(true);
    try {
      await register(username, email, password);
      navigate(redirect, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : '注册失败');
    } finally {
      setLoading(false);
    }
  };

  function handleGithubRegister() {
    startGithubAuth();
  }

  return (
    <div className="auth-page">
      <div className="auth-page__card">
        <div className="auth-page__brand">
          <span className="auth-page__logo">M</span>
          <span className="auth-page__brand-name">Marginalia</span>
        </div>
        <h1 className="auth-page__title">创建账户</h1>
        <p className="auth-page__subtitle">加入论坛，与志同道合的朋友一起交流。</p>

        {error && <div className="auth-page__error">{error}</div>}

        <button
          onClick={handleGithubRegister}
          className="auth-page__btn auth-page__btn--social auth-page__btn--github"
        >
          <svg className="auth-page__social-icon" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
          </svg>
          <span>使用 GitHub 创建账户</span>
        </button>

        <div className="auth-page__divider">
          <span className="auth-page__divider-line" />
          <span className="auth-page__divider-text">或</span>
          <span className="auth-page__divider-line" />
        </div>

        <form onSubmit={handleSubmit} className="auth-page__form">
          <div className="auth-page__field">
            <label className="auth-page__label">用户名</label>
            <input
              className="auth-page__input"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoFocus
              placeholder="3-20 位字母、数字、下划线"
            />
          </div>
          <div className="auth-page__field">
            <label className="auth-page__label">邮箱</label>
            <input
              className="auth-page__input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="email@example.com"
            />
          </div>
          <div className="auth-page__field">
            <label className="auth-page__label">密码</label>
            <input
              className="auth-page__input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="至少 8 位"
            />
          </div>
          <div className="auth-page__field">
            <label className="auth-page__label">确认密码</label>
            <input
              className="auth-page__input"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              placeholder="再次输入密码"
            />
          </div>
          <div className="auth-page__actions">
            <button type="submit" className="auth-page__btn auth-page__btn--primary" disabled={loading}>
              {loading ? '注册中…' : '创建账号'}
            </button>
          </div>
        </form>

        <p className="auth-page__footer">
          已有账户？{' '}
          <Link to="/login" className="auth-page__link">
            立即登录
          </Link>
        </p>
      </div>
    </div>
  );
}
