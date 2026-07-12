import '../stylesheets/howitworks.css'
import { Link } from 'react-router-dom'

function NotFoundTwo() {
  const token = localStorage.getItem('authToken')

  return (
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
            <svg viewBox="0 0 364 224" xmlns="http://www.w3.org/2000/svg" className="logo-desktop four" aria-label="Steak & Eggs logo">
              <ellipse cx="182" cy="112" rx="180" ry="110" fill="#f5f5f5" stroke="#d3d3d3" strokeWidth="4" />
              <path d="m122 82c-20-10 40-30 120 0 30 20 20 60-10 70-70 20-130 0-140-30-10-20 10-30 30-40" fill="#8b4513" stroke="#654321" strokeWidth="3" />
              <g stroke="#472400" strokeWidth="3">
                <path d="m142 92 60 10" />
                <path d="m162 112 60 10" />
                <path d="m152 132 60 10" />
              </g>
              <circle cx="142" cy="62" r="35" fill="#fff" stroke="#e6e6e6" strokeWidth="2" />
              <circle cx="142" cy="62" r="12" fill="#ffd700" />
              <circle cx="232" cy="52" r="30" fill="#fff" stroke="#e6e6e6" strokeWidth="2" />
              <circle cx="232" cy="52" r="10" fill="#ffd700" />
              <text x="182" y="222" fill="#333333" fontFamily="Arial, sans-serif" fontSize="32px" fontWeight="bold" textAnchor="middle">
                STEAK &amp; EGGS
              </text>
            </svg>
          </Link>
        </div>
      </div>
    </div>
  )
}

export default NotFoundTwo
