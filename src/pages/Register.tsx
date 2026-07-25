import { useState, FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

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

  return (
    <div className="form-page">
      <h1 className="form-page__title">注册</h1>
      <p className="form-page__subtitle">加入论坛，发帖、评论、点赞、收藏与私信。</p>

      {error && <div className="form__error">{error}</div>}

      <form onSubmit={handleSubmit} className="form">
        <div className="form__field">
          <label className="form__label">用户名</label>
          <input
            className="form__input"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            autoFocus
            placeholder="3-20 位字母、数字、下划线"
          />
        </div>
        <div className="form__field">
          <label className="form__label">邮箱</label>
          <input
            className="form__input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="form__row">
          <div className="form__field">
            <label className="form__label">密码</label>
            <input
              className="form__input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="至少 8 位"
            />
          </div>
          <div className="form__field">
            <label className="form__label">确认密码</label>
            <input
              className="form__input"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
            />
          </div>
        </div>
        <div className="form__actions">
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? '注册中…' : '创建账号'}
          </button>
          <Link to="/login" className="btn-secondary">
            已有账号？登录
          </Link>
        </div>
      </form>
    </div>
  );
}
