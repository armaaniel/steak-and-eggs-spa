import '../stylesheets/notfound.css'
import { Link } from 'react-router-dom'
import Logo from './Logo'

function NotFoundTwo() {
  const token = localStorage.getItem('authToken')

  return (
    <div className="not-found-main">
      <div className="not-found-parent">
        <div className="not-found-header">
          <h1>
            Page cannot be found <br />
            Click our logo <br /> To go back to the app{' '}
          </h1>
        </div>

        <div>
          <Link to={token ? '/home' : '/'}>
            <Logo className="large" />
          </Link>
        </div>
      </div>
    </div>
  )
}

export default NotFoundTwo
