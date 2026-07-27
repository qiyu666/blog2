import { useState, FormEvent, useEffect, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { loginVerify2fa, startGithubAuth } from '../api';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const redirect = params.get('redirect') || '/';

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [twofaToken, setTwofaToken] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const codeInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (twofaToken) codeInputRef.current?.focus()
  }, [twofaToken])

  useEffect(() => {
    const githubError = params.get('github_error')
    if (githubError) {
      setError(decodeURIComponent(githubError))
    }
  }, [params])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await login(identifier, password);
      if (result.requires_2fa && result.twofa_token) {
        setTwofaToken(result.twofa_token);
        setCode('');
        return;
      }
      navigate(redirect, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : '登录失败');
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify2fa(e: FormEvent) {
    e.preventDefault();
    if (!twofaToken) return;
    setError('');
    setLoading(true);
    try {
      await loginVerify2fa(twofaToken, code.trim());
      navigate(redirect, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : '验证失败');
    } finally {
      setLoading(false);
    }
  }

  function handleGithubLogin() {
    startGithubAuth();
  }

  if (twofaToken) {
    return (
      <div className="auth-page">
        <div className="auth-page__card">
          <div className="auth-page__brand">
            <span className="auth-page__logo">M</span>
            <span className="auth-page__brand-name">Marginalia</span>
          </div>
          <h1 className="auth-page__title">两步验证</h1>
          <p className="auth-page__subtitle">
            请打开你的验证器 App（如 Google Authenticator、1Password、Authy），输入显示的 6 位验证码。
          </p>

          {error && <div className="auth-page__error">{error}</div>}

          <form onSubmit={handleVerify2fa} className="auth-page__form">
            <div className="auth-page__field">
              <input
                ref={codeInputRef}
                className="auth-page__input auth-page__input--code"
                type="text"
                inputMode="numeric"
                pattern="\d{6}"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                placeholder="123456"
                required
                autoComplete="one-time-code"
              />
            </div>
            <div className="auth-page__actions">
              <button type="submit" className="auth-page__btn auth-page__btn--primary" disabled={loading || code.length !== 6}>
                {loading ? '验证中…' : '验证并登录'}
              </button>
              <button
                type="button"
                className="auth-page__btn auth-page__btn--ghost"
                onClick={() => {
                  setTwofaToken(null);
                  setCode('');
                  setError('');
                }}
              >
                返回
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-page__card">
        <div className="auth-page__brand">
          <span className="auth-page__logo">M</span>
          <span className="auth-page__brand-name">Marginalia</span>
        </div>
        <h1 className="auth-page__title">欢迎回来</h1>
        <p className="auth-page__subtitle">登录你的账户，继续探索和交流。</p>

        {error && <div className="auth-page__error">{error}</div>}

        <button
          onClick={handleGithubLogin}
          className="auth-page__btn auth-page__btn--social auth-page__btn--github"
        >
          <svg className="auth-page__social-icon" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
          </svg>
          <span>继续使用 GitHub</span>
        </button>

        <div className="auth-page__divider">
          <span className="auth-page__divider-line" />
          <span className="auth-page__divider-text">或</span>
          <span className="auth-page__divider-line" />
        </div>

        <form onSubmit={handleSubmit} className="auth-page__form">
          <div className="auth-page__field">
            <label className="auth-page__label">用户名或邮箱</label>
            <input
              className="auth-page__input"
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
              autoFocus
              placeholder="用户名 或 email@example.com"
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
              placeholder="你的密码"
            />
          </div>
          <div className="auth-page__actions">
            <button type="submit" className="auth-page__btn auth-page__btn--primary" disabled={loading}>
              {loading ? '登录中…' : '登录'}
            </button>
          </div>
        </form>

        <p className="auth-page__footer">
          还没有账户？{' '}
          <Link to="/register" className="auth-page__link">
            立即注册
          </Link>
        </p>

        <p className="auth-page__hint">
          站内信用于站内成员之间的通信。如需站外邮箱服务，请访问{' '}
          <a
            href="https://mail.qiyu666.dpdns.org"
            target="_blank"
            rel="noreferrer"
            className="auth-page__link"
          >
            mail.qiyu666.dpdns.org
          </a>
          。
        </p>
      </div>
    </div>
  );
}
