import { useState, useRef, useEffect } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import Logo from './Logo'
import Searchbar from './Searchbar'
import type { DemoContext } from '../layouts/Public'

interface Props {
  showSearch?: boolean
  demo: DemoContext
}

const PublicNav = ({ showSearch = true, demo }: Props) => {
  const { tryDemo, isSubmitting, error } = demo
  const { pathname } = useLocation()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [theme, setTheme] = useState(() => (document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'))
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    document.documentElement.dataset.theme = next
    localStorage.setItem('theme', next)
    setTheme(next)
  }

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

        <button className={`nav-text ${isSubmitting ? 'submitting' : ''}`} onClick={() => tryDemo(destination)} disabled={isSubmitting}>
          <span>Try Demo</span>
        </button>

        <NavLink to="/datacat" className='nav-text' state={{ authBoolean: false }}>
          <span>DataCat</span>
        </NavLink>

        <span className={`nav-error ${error ? 'visible' : ''}`}>{error ? 'Error, please try again' : '\u00A0'}</span>
      </div>

      <div className={`nav-right ${showSearch ? 'with-search' : ''}`}>
        {showSearch && <Searchbar />}

        <div className="profile-dropdown-wrapper" ref={dropdownRef}>
          <button
            className="btn btn-secondary profile-trigger"
            onClick={() => setDropdownOpen(o => !o)}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <circle cx="5" cy="12" r="1.75" />
              <circle cx="12" cy="12" r="1.75" />
              <circle cx="19" cy="12" r="1.75" />
            </svg>
          </button>

          {dropdownOpen && (
            <div className="profile-dropdown">
              <Link
                to="/about"
                className="profile-dropdown-item"
                onClick={() => setDropdownOpen(false)}
              >
                About
              </Link>
              <hr className="profile-dropdown-divider" />
              <a
                href="https://www.notion.so/Steak-Eggs-3487e61da1f98087811cd2dd38b7f662?source=copy_link"
                className="profile-dropdown-item"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setDropdownOpen(false)}
              >
                Notion
              </a>
              <hr className="profile-dropdown-divider" />
              <a
                href="https://github.com/armaaniel"
                className="profile-dropdown-item"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setDropdownOpen(false)}
              >
                Github
              </a>
              <hr className="profile-dropdown-divider" />
              <button className="profile-dropdown-item" onClick={toggleTheme}>
                {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}

export default PublicNav
