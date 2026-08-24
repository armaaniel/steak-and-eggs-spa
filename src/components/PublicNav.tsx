import { Link, NavLink } from 'react-router-dom'
import Logo from './Logo'
import Searchbar from './Searchbar'
import ThemeToggle from './ThemeToggle'

interface Props {
  showSearch?: boolean
}

const PublicNav = ({ showSearch = true }: Props) => {
  return (
    <nav className="nav">
      <div className="nav-left">
        <Link to="/" className="nav-logo">
          <Logo />
        </Link>

        <NavLink to="/login" className={({ isActive }) => `nav-text ${isActive ? 'active' : ''}`}>
          <span>Log In</span>
        </NavLink>

        <NavLink to="/signup" className={({ isActive }) => `nav-text ${isActive ? 'active' : ''}`}>
          <span>Sign Up</span>
        </NavLink>

        <NavLink to="/datacat" className='nav-text' state={{ authBoolean: false }}>
          <span>DataCat (APM)</span>
        </NavLink>

        <a href="https://github.com/armaaniel" className="nav-text" target="_blank" rel="noopener noreferrer">
          <span>Github</span>
        </a>

        <a href="https://www.notion.so/Steak-Eggs-3487e61da1f98087811cd2dd38b7f662?source=copy_link" className="nav-text" target="_blank" rel="noopener noreferrer">
          <span>Notion</span>
        </a>
      </div>

      <div className={`nav-right ${showSearch ? 'with-search' : ''}`}>
        {showSearch && <Searchbar />}
        <ThemeToggle />
      </div>
    </nav>
  )
}

export default PublicNav
