import '../stylesheets/howitworks.css'
import { Link } from 'react-router-dom'
import Logo from '../components/Logo'

function NotFound() {
  const token = localStorage.getItem('authToken')

  return (
    <>
      <header>
        <nav className="nav">
          <Link to={token ? '/home' : '/'}>
            <Logo />
          </Link>
        </nav>
      </header>

      <main className="home two">
        <div className="four-main">
          <div className="howto-parent four">
            <div className="howto-header four">
              <h1>
                Page cannot be found <br />
                Click our logo <br /> To go back to the app{' '}
              </h1>
            </div>

            <div>
              <Link to={token ? '/home' : '/'}>
                <Logo className="four" />
              </Link>
            </div>
          </div>
        </div>
      </main>
    </>
  )
}

export default NotFound
