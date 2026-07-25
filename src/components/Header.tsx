import { Link } from 'react-router-dom'

export default function Header() {
  return (
    <header className="site-header">
      <div className="site-header__inner">
        <Link to="/" className="brand">
          Marginalia<span className="brand__dot">.</span>
        </Link>
        <nav className="nav">
          <Link to="/" className="nav__link">Journal</Link>
          <a href="#essays" className="nav__link">Essays</a>
          <a href="#culture" className="nav__link">Culture</a>
          <a href="#tech" className="nav__link">Technology</a>
          <Link to="/new" className="nav__write">Write</Link>
        </nav>
      </div>
    </header>
  )
}
