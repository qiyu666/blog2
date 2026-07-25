import { useState, FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const redirect = params.get('redirect') || '/';

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(identifier, password);
      navigate(redirect, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : '登录失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="form-page">
      <h1 className="form-page__title">登录</h1>
      <p className="form-page__subtitle">回到论坛，继续对话。</p>

      {error && <div className="form__error">{error}</div>}

      <form onSubmit={handleSubmit} className="form">
        <div className="form__field">
          <label className="form__label">用户名或邮箱</label>
          <input
            className="form__input"
            type="text"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            required
            autoFocus
          />
        </div>
        <div className="form__field">
          <label className="form__label">密码</label>
          <input
            className="form__input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <div className="form__actions">
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? '登录中…' : '登录'}
          </button>
          <Link to="/register" className="btn-secondary">
            注册新账号
          </Link>
        </div>
      </form>

      <p className="form__hint">
        站内信用于站内成员之间的通信。如需站外邮箱服务，请访问{' '}
        <a
          href="https://mail.qiyu666.dpdns.org"
          target="_blank"
          rel="noreferrer"
          className="inline-link"
        >
          mail.qiyu666.dpdns.org
        </a>
        。
      </p>
    </div>
  );
}
