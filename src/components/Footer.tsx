export default function Footer() {
  const year = new Date().getFullYear()
  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <div className="site-footer__top">
          <div>
            <div className="site-footer__brand">Marginalia</div>
            <p className="site-footer__desc">
              A journal of slow ideas — essays, field notes, and meditations
              from the edges of attention. Published irregularly, read carefully.
            </p>
          </div>
          <div>
            <div className="site-footer__col-title">Sections</div>
            <ul className="site-footer__list">
              <li><a href="/">Journal</a></li>
              <li><a href="/new">Write</a></li>
              <li><a href="/">All Posts</a></li>
            </ul>
          </div>
          <div>
            <div className="site-footer__col-title">Elsewhere</div>
            <ul className="site-footer__list">
              <li><a href="https://developers.cloudflare.com/pages/" target="_blank" rel="noreferrer">Cloudflare Pages</a></li>
              <li><a href="https://github.com/qiyu666" target="_blank" rel="noreferrer">GitHub</a></li>
              <li><a href="mailto:hello@marginalia.blog">Contact</a></li>
            </ul>
          </div>
        </div>
        <div className="site-footer__bottom">
          <span>© {year} Marginalia. All words carefully chosen.</span>
          <span>Built with React · Cloudflare Pages · D1</span>
        </div>
      </div>
    </footer>
  )
}
