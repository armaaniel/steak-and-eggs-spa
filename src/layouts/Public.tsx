import { Outlet } from 'react-router-dom'
import { Link } from 'react-router-dom'
import Logo from '../components/Logo'
import '../stylesheets/public.css'

function Public() {
  const token = localStorage.getItem('authToken')

  return (
    <>
      <header>
        <nav className="nav">
          <div className="nav-left">
            <Link to="/">
              <Logo />
            </Link>

            <Link to="/datacat" className="nav-text" state={{ authBoolean: false }}>
              <span>DataCat (APM)</span>
            </Link>

            <a href="https://github.com/armaaniel" className="nav-text" target="_blank" rel="noopener noreferrer">
              <span>Github</span>
            </a>
          </div>

          <div className="nav-right">
            <a href="https://www.notion.so/Steak-Eggs-3487e61da1f98087811cd2dd38b7f662?source=copy_link" className="nav-text" target="_blank" rel="noopener noreferrer">
              <span>Architecture</span>
            </a>

            <Link to={token ? '/home' : '/login'} className="login-link">
              Log In
            </Link>

            <Link to={token ? '/home' : '/signup'} className="login-link signup">
              Sign Up
            </Link>
          </div>
        </nav>
      </header>

      <Outlet />
    </>
  )
}

export default Public
