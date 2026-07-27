import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { updateProfile } from '../api';

export default function OAuthSetup() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [displayName, setDisplayName] = useState(user?.display_name || user?.username || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!user) {
    navigate('/');
    return null;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    if (!displayName.trim()) {
      setError('请输入显示名称');
      return;
    }

    if (password && password.length < 8) {
      setError('密码至少需要 8 个字符');
      return;
    }

    if (password !== confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }

    setLoading(true);
    try {
      await updateProfile(user!.username, { display_name: displayName.trim() });
      if (password) {
        await fetch('/api/auth/change-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ newPassword: password }),
          credentials: 'same-origin',
        });
      }
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : '更新失败');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-page__card">
        <div className="auth-page__brand">
          <span className="auth-page__logo">M</span>
          <span className="auth-page__brand-name">Marginalia</span>
        </div>
        <h1 className="auth-page__title">欢迎来到社区</h1>
        <p className="auth-page__subtitle">
          你已通过 GitHub 登录。请完成以下设置。
        </p>

        {error && <div className="form__error">{error}</div>}

        <form onSubmit={handleSubmit} className="form">
          <div className="form__field">
            <label className="form__label">显示名称</label>
            <input
              className="form__input"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="你的昵称"
              maxLength={50}
              required
            />
            <p className="form__hint">这个名称会显示在你的个人资料和帖子中，可以随时修改。</p>
          </div>

          <div className="form__field">
            <label className="form__label">密码（可选）</label>
            <input
              className="form__input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="设置密码以便后续登录"
              minLength={8}
            />
            <p className="form__hint">设置后，你可以使用用户名/邮箱 + 密码登录，也可以继续使用 GitHub 登录。</p>
          </div>

          {password && (
            <div className="form__field">
              <label className="form__label">确认密码</label>
              <input
                className="form__input"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="再次输入密码"
                required
              />
            </div>
          )}

          <div className="form__actions">
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? '保存中…' : '完成设置'}
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => logout().then(() => navigate('/'))}
            >
              取消登录
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
