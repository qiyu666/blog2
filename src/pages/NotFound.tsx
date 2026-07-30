import { Link } from 'react-router-dom'
import { useState, useEffect } from 'react'

export default function NotFound() {
  const [count, setCount] = useState(15)

  useEffect(() => {
    const timer = setInterval(() => {
      setCount(prev => {
        if (prev <= 1) {
          clearInterval(timer)
          window.location.href = '/'
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="not-found">
      <div className="not-found__bg" />
      <div className="not-found__content">
        <div className="not-found__code">404</div>
        <h1 className="not-found__title">页面走丢了</h1>
        <p className="not-found__desc">
          你访问的页面不存在，可能已被移动或删除。
        </p>
        <div className="not-found__actions">
          <Link to="/" className="not-found__btn not-found__btn--primary">
            返回首页
          </Link>
          <Link to="/search" className="not-found__btn not-found__btn--ghost">
            搜索内容
          </Link>
        </div>
        <p className="not-found__countdown">
          {count} 秒后自动返回首页
        </p>
        <div className="not-found__illustration">
          <svg viewBox="0 0 200 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="not-found__svg">
            <rect x="40" y="20" width="120" height="80" rx="8" stroke="var(--muted-soft)" strokeWidth="2" fill="none"/>
            <circle cx="100" cy="55" r="15" stroke="var(--accent)" strokeWidth="2" fill="none"/>
            <path d="M95 65 L100 70 L110 55" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
            <circle cx="60" cy="50" r="4" fill="var(--muted-soft)"/>
            <circle cx="140" cy="50" r="4" fill="var(--muted-soft)"/>
            <path d="M55 90 Q80 100 100 90 Q120 80 145 90" stroke="var(--line)" strokeWidth="1.5" fill="none"/>
          </svg>
        </div>
      </div>
    </div>
  )
}
