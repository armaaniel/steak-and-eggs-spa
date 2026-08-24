import { Link, NavLink, useLocation } from 'react-router-dom'
import Logo from './Logo'
import Searchbar from './Searchbar'
import ThemeToggle from './ThemeToggle'
import type { DemoContext } from '../layouts/Public'

interface Props {
  showSearch?: boolean
  demo: DemoContext
}

const PublicNav = ({ showSearch = true, demo }: Props) => {
  const { tryDemo, isSubmitting, error } = demo
  const { pathname } = useLocation()

  /* '/' and /stocks/:symbol both render Stocks, so stay put else go to home  */
  const isStocksRoute = pathname === '/' || pathname.startsWith('/stocks/')
  const destination = isStocksRoute ? pathname : '/home'

  return (
    <nav className="nav">
      <div className="nav-left">
        <Link to="/" className="nav-logo">
          <Logo />
        </Link>

        <NavLink to="/login" className={({ isActive }) => `nav-text ${isActive ? 'active' : ''}`}>
          <span>Login</span>
        </NavLink>

        <NavLink to="/signup" className={({ isActive }) => `nav-text ${isActive ? 'active' : ''}`}>
          <span>Sign Up</span>
        </NavLink>

        <NavLink to="/about" className={({ isActive }) => `nav-text ${isActive ? 'active' : ''}`}>
          <span>About</span>
        </NavLink>

        <button className={`nav-text ${isSubmitting ? 'submitting' : ''}`} onClick={() => tryDemo(destination)} disabled={isSubmitting}>
          <span>Try Demo</span>
        </button>

        <NavLink to="/datacat" className='nav-text' state={{ authBoolean: false }}>
          <span>DataCat</span>
        </NavLink>

        <a href="https://github.com/armaaniel" className="nav-text" target="_blank" rel="noopener noreferrer">
          <span>Github</span>
        </a>

        <a href="https://www.notion.so/Steak-Eggs-3487e61da1f98087811cd2dd38b7f662?source=copy_link" className="nav-text" target="_blank" rel="noopener noreferrer">
          <span>Notion</span>
        </a>

        <span className={`nav-error ${error ? 'visible' : ''}`}>{error ? 'Error, please try again' : '\u00A0'}</span>
      </div>

      <div className={`nav-right ${showSearch ? 'with-search' : ''}`}>
        {showSearch && <Searchbar />}
        <ThemeToggle />
      </div>
    </nav>
  )
}

export default PublicNav
