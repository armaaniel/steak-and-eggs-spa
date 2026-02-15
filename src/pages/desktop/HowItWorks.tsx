import '../../stylesheets/desktop/howitworks.css'
import { Link } from 'react-router-dom'

function HowItWorks() {
  return (
    <div className="howto-main">
      <div className="howto-parent">
        <div className="howto-header">
          <h1>
            A stock trading simulator <br />
            with 15-minute-delayed data <br />
            and no real money involved{' '}
          </h1>
        </div>

        <Link to="/signup" className="login-link signup howto">
          Get Started
        </Link>

        <div className="howto-body">
          <Link to="/signup" className="howto-create">
            Create an account
          </Link>
          <p>Add funds to your account</p>
          <p>Add stocks and track your gains and losses in real time</p>
        </div>
      </div>
    </div>
  )
}

export default HowItWorks
