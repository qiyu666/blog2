import { useTranslation } from 'react-i18next'
import { useState, useRef, useEffect } from 'react'

export default function LanguageSwitcher() {
  const { i18n } = useTranslation()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const currentLang = i18n.language || 'zh'

  function changeLang(lang: string) {
    i18n.changeLanguage(lang)
    localStorage.setItem('blog-lang', lang)
    setOpen(false)
    window.location.reload()
  }

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div className="lang-switcher" ref={ref}>
      <button
        type="button"
        className="lang-switcher__btn"
        onClick={() => setOpen(!open)}
        title={currentLang === 'zh' ? '中文' : 'English'}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <line x1="2" y1="12" x2="22" y2="12"/>
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
        </svg>
        <span>{currentLang === 'zh' ? '中' : 'EN'}</span>
      </button>
      {open && (
        <div className="lang-switcher__dropdown">
          <button
            type="button"
            className={`lang-switcher__option ${currentLang === 'zh' ? 'lang-switcher__option--active' : ''}`}
            onClick={() => changeLang('zh')}
          >
            中文
          </button>
          <button
            type="button"
            className={`lang-switcher__option ${currentLang === 'en' ? 'lang-switcher__option--active' : ''}`}
            onClick={() => changeLang('en')}
          >
            English
          </button>
        </div>
      )}
    </div>
  )
}
