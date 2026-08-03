import { Component, ReactNode } from 'react'
import i18n from '../i18n'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

/**
 * 全局错误边界：任意子组件抛出未捕获错误时，展示友好提示而非整页白屏。
 * i18n 在 class 组件里无法用 hooks，这里直接读 i18next 实例。
 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: unknown) {
    // 后续可接入日志服务
    console.error('[ErrorBoundary]', error, info)
  }

  handleReload = () => {
    window.location.reload()
  }

  handleHome = () => {
    this.setState({ hasError: false, error: null })
    window.location.href = '/'
  }

  render() {
    if (!this.state.hasError) return this.props.children

    const t = i18n.t.bind(i18n)
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem',
          background: 'var(--bg, #fafafa)',
          color: 'var(--ink, #1a1a1a)',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: '3rem', fontWeight: 700, marginBottom: '0.5rem' }}>500</div>
        <h1 style={{ fontSize: '1.25rem', marginBottom: '0.75rem' }}>
          {t('error.title')}
        </h1>
        <p style={{ color: 'var(--muted, #888)', marginBottom: '1.5rem', maxWidth: '32rem' }}>
          {t('error.desc')}
        </p>
        {this.state.error && (
          <pre
            style={{
              fontSize: '0.75rem',
              color: 'var(--muted, #888)',
              background: 'var(--bg-deep, #f0f0f0)',
              padding: '0.75rem 1rem',
              borderRadius: '0.5rem',
              marginBottom: '1.5rem',
              maxWidth: '40rem',
              overflow: 'auto',
              textAlign: 'left',
            }}
          >
            {this.state.error.message}
          </pre>
        )}
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={this.handleReload}
            style={{
              padding: '0.5rem 1.25rem',
              borderRadius: '9999px',
              border: 'none',
              background: 'var(--accent, #f97316)',
              color: '#fff',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            {t('error.reload')}
          </button>
          <button
            onClick={this.handleHome}
            style={{
              padding: '0.5rem 1.25rem',
              borderRadius: '9999px',
              border: '1px solid var(--line, #e5e5e5)',
              background: 'transparent',
              color: 'var(--ink-soft, #555)',
              cursor: 'pointer',
            }}
          >
            {t('error.home')}
          </button>
        </div>
      </div>
    )
  }
}
