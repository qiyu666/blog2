export default function Footer() {
  const year = new Date().getFullYear()
  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        {/* Newsletter CTA */}
        <div className="site-footer__newsletter">
          <div className="site-footer__newsletter-eyebrow">慢思通讯</div>
          <h3 className="site-footer__newsletter-title">
            慢想法，<em>慢慢</em>送达。
          </h3>
          <p className="site-footer__newsletter-desc">
            订阅我们的不定期通讯，获取精选随笔、阅读清单和思考片段。
            不频繁，不打扰，只在有话要说的时候出现。
          </p>
          <form className="site-footer__newsletter-form" onSubmit={(e) => e.preventDefault()}>
            <input
              type="email"
              className="site-footer__newsletter-input"
              placeholder="你的邮箱@example.com"
              aria-label="邮箱地址"
            />
            <button type="submit" className="site-footer__newsletter-btn">
              订阅
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
              慢思随笔。
            </div>
            <p className="site-footer__desc">
              一个自由的博客论坛，分享想法、交流观点。
              发帖、评论、点赞、收藏，与同好一起探索更多可能。
            </p>
          </div>
          <div>
            <div className="site-footer__col-title">栏目</div>
            <ul className="site-footer__list">
              <li><a href="/">论坛</a></li>
              <li><a href="/new">发帖</a></li>
              <li><a href="/">全部帖子</a></li>
              <li><a href="/">热门话题</a></li>
            </ul>
          </div>
          <div>
            <div className="site-footer__col-title">探索</div>
            <ul className="site-footer__list">
              <li><a href="/">精选文章</a></li>
              <li><a href="/">作者</a></li>
              <li><a href="/">标签</a></li>
              <li><a href="/">归档</a></li>
            </ul>
          </div>
          <div>
            <div className="site-footer__col-title">其他</div>
            <ul className="site-footer__list">
              <li><a href="https://github.com/qiyu666" target="_blank" rel="noreferrer">GitHub</a></li>
              <li><a href="/bug-report">提交 Bug</a></li>
              <li><a href="mailto:hello@marginalia.blog">联系我们</a></li>
              <li><a href="/">关于</a></li>
            </ul>
          </div>
        </div>

        <div className="site-footer__bottom">
          <div className="site-footer__bottom-left">
            <span>© {year} Marginalia</span>
            <span className="site-footer__divider"></span>
            <span>所有内容用心呈现</span>
          </div>
          <div className="site-footer__bottom-right">
            <span>基于 React · D1 构建</span>
            <span className="site-footer__divider"></span>
            <span>用心制作</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
