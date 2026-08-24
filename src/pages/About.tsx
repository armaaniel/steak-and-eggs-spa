import { Link } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { useDemo } from '../layouts/Public'
import '../stylesheets/about.css'

function About() {
  const { token } = useAuth()
  const isAuthenticated = token !== null
  const { tryDemo, isSubmitting, error } = useDemo()

  return (
    <div className="about-main">
      <div className="about-parent">
        <h2 className="about-section-title">What Steak &amp; Eggs is</h2>
        <p>
          Steak &amp; Eggs is a paper trading platform. It runs on 15-minute delayed market data,
          but the money is fake. You can add funds, place fake trades on real stocks, and watch
          them play out in real time.
        </p>

        <h2 className="about-section-title">What you can do</h2>
        <ul>
          <li>Search any stock we offer and pull up its chart, price, and company details.</li>
          <li>
            Buy and sell at the quoted price. Orders fill instantly and no shares actually change
            hands.
          </li>
          <li>
            Watch your positions&apos; profit and loss update in real time as prices stream in.
          </li>
          <li>
            View every trade you&apos;ve placed, with the price, value, and realized profit or loss
            on each.
          </li>
          <li>
            Track your performance over time, with your portfolio value recorded day over day.
          </li>
        </ul>

        <h2 className="about-section-title">What it costs</h2>
        <p>
          Nothing. No card, no minimum, no brokerage account, no funding step. Sign up with a
          username and you&apos;re in.
        </p>
        <p>
          If you&apos;d rather not sign up at all, the demo account gets you a funded portfolio and
          full access on the spot.
        </p>

        <h2 className="about-section-title">What it isn&apos;t</h2>
        <p>
          Steak &amp; Eggs is not a broker, and it isn&apos;t investment advice. It doesn&apos;t take
          deposits, no real securities are bought and sold, and none of the money on the platform
          is real.
        </p>

        {!isAuthenticated && (
          <div className="about-actions">
            <Link to="/login" className="btn btn-ghost">
              Log In
            </Link>

            <Link to="/signup" className="btn btn-primary">
              Sign Up
            </Link>

            <button className="btn btn-ghost" onClick={() => tryDemo()} disabled={isSubmitting}>
              Try Demo
            </button>

            <div className={`about-error-container ${error ? 'visible' : ''}`}>
              <p>{error || ' '}</p>
            </div>
          </div>
        )}

        <div className="about-footer">
          <p>
            <Link to="/privacy">Privacy Policy</Link>
          </p>
          <p>&copy; 2026 Steak &amp; Eggs. All rights reserved.</p>
        </div>
      </div>
    </div>
  )
}

export default About
