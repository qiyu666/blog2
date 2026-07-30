import { useTranslation } from 'react-i18next'

export default function Footer() {
  const { t } = useTranslation()
  const year = new Date().getFullYear()
  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        {/* Newsletter CTA */}
        <div className="site-footer__newsletter">
          <div className="site-footer__newsletter-eyebrow">{t('footer.newsletterEyebrow')}</div>
          <h3 className="site-footer__newsletter-title">
            {t('footer.newsletterTitle')}<em>{t('footer.newsletterTitleEm')}</em>{t('footer.newsletterTitleSuffix')}
          </h3>
          <p className="site-footer__newsletter-desc">
            {t('footer.newsletterDesc')}
          </p>
          <form className="site-footer__newsletter-form" onSubmit={(e) => e.preventDefault()}>
            <input
              type="email"
              className="site-footer__newsletter-input"
              placeholder={t('footer.newsletterPlaceholder')}
              aria-label={t('footer.newsletterAriaLabel')}
            />
            <button type="submit" className="site-footer__newsletter-btn">
              {t('footer.subscribeBtn')}
            </button>
          </form>
        </div>

        {/* Main Footer Content */}
        <div className="site-footer__top">
          <div className="site-footer__brand-col">
            <div className="site-footer__brand">
              Marginalia<span className="site-footer__brand-dot">.</span>
            </div>
            <div className="site-footer__tagline">
              {t('footer.tagline')}
            </div>
            <p className="site-footer__desc">
              {t('footer.desc')}
            </p>
          </div>
          <div>
            <div className="site-footer__col-title">{t('footer.colSections')}</div>
            <ul className="site-footer__list">
              <li><a href="/">{t('footer.forum')}</a></li>
              <li><a href="/new">{t('footer.newPost')}</a></li>
              <li><a href="/">{t('footer.allPosts')}</a></li>
              <li><a href="/">{t('footer.hotTopics')}</a></li>
            </ul>
          </div>
          <div>
            <div className="site-footer__col-title">{t('footer.colExplore')}</div>
            <ul className="site-footer__list">
              <li><a href="/">{t('footer.featuredArticles')}</a></li>
              <li><a href="/">{t('footer.authors')}</a></li>
              <li><a href="/">{t('footer.tags')}</a></li>
              <li><a href="/">{t('footer.archive')}</a></li>
            </ul>
          </div>
          <div>
            <div className="site-footer__col-title">{t('footer.colOther')}</div>
            <ul className="site-footer__list">
              <li><a href="https://github.com/qiyu666" target="_blank" rel="noreferrer">GitHub</a></li>
              <li><a href="/bug-report">{t('footer.submitBug')}</a></li>
              <li><a href="mailto:hello@marginalia.blog">{t('footer.contact')}</a></li>
              <li><a href="/">{t('footer.about')}</a></li>
            </ul>
          </div>
        </div>

        <div className="site-footer__bottom">
          <div className="site-footer__bottom-left">
            <span>{t('footer.copyright', { year })}</span>
            <span className="site-footer__divider"></span>
            <span>{t('footer.bottomLeft')}</span>
          </div>
          <div className="site-footer__bottom-right">
            <span>{t('footer.poweredBy')}</span>
            <span className="site-footer__divider"></span>
            <span>{t('footer.crafted')}</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
