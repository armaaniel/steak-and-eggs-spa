import '../stylesheets/privacy.css'

function Privacy() {
  return (
    <div className="privacy-main">
      <div className="privacy-parent">
        <h1 className="privacy-header">Privacy Policy</h1>
        <p className="privacy-updated">Last updated: March 18, 2026</p>

        <p>
          Steak & Eggs ("we", "our", or "the app") is a simulated stock trading
          platform. This Privacy Policy explains what information we collect, how
          we use it, and your rights regarding your data.
        </p>

        <h2 className="privacy-section-title">1. Information We Collect</h2>
        <p>When you use Steak & Eggs, we collect the following information:</p>
        <ul>
          <li>
            <strong>Account information:</strong> Username and password (stored
            as a secure hash — we never store your password in plain text).
          </li>
          <li>
            <strong>Trading activity:</strong> Simulated buy and sell
            transactions, portfolio positions, deposit and withdrawal history,
            and portfolio value records.
          </li>
          <li>
            <strong>Device information:</strong> Basic device and platform
            information necessary for app functionality.
          </li>
        </ul>
        <p>
          We do <strong>not</strong> collect your real name, email address, phone
          number, location data, financial account information, or any
          government-issued identification.
        </p>

        <h2 className="privacy-section-title">2. How We Use Your Information</h2>
        <p>We use the information we collect to:</p>
        <ul>
          <li>Provide and operate the simulated trading platform.</li>
          <li>Authenticate your account and maintain your session.</li>
          <li>Display your portfolio, positions, and transaction history.</li>
          <li>Improve app performance and reliability.</li>
        </ul>

        <h2 className="privacy-section-title">3. Data Storage and Security</h2>
        <p>
          Your data is stored on secure servers. Passwords are encrypted using
          bcrypt hashing. Authentication is handled via JSON Web Tokens (JWT).
          All communication between the app and our servers is encrypted using
          HTTPS/TLS.
        </p>

        <h2 className="privacy-section-title">4. Third-Party Services</h2>
        <p>We use the following third-party services:</p>
        <ul>
          <li>
            <strong>Sentry</strong> — for error monitoring and crash reporting.
            Sentry may receive anonymized error data to help us diagnose and fix
            issues.
          </li>
          <li>
            <strong>Logo.dev</strong> — to display stock ticker logos. Your
            device makes requests to their servers to load images.
          </li>
          <li>
            <strong>Polygon.io</strong> — to retrieve market data such as stock
            prices and charts. No personal data is shared with Polygon.
          </li>
        </ul>

        <h2 className="privacy-section-title">5. Data Sharing</h2>
        <p>
          We do not sell, rent, or share your personal information with third
          parties for marketing purposes. We may share anonymized, aggregated
          data for analytics or if required by law.
        </p>

        <h2 className="privacy-section-title">6. Data Retention</h2>
        <p>
          We retain your account data for as long as your account is active. If
          you delete your account, all associated data — including your
          positions, transactions, and portfolio records — is permanently removed
          from our servers.
        </p>

        <h2 className="privacy-section-title">7. Your Rights</h2>
        <p>You have the right to:</p>
        <ul>
          <li>
            <strong>Access your data:</strong> View your portfolio, positions,
            and transaction history within the app.
          </li>
          <li>
            <strong>Delete your account:</strong> You can permanently delete your
            account and all associated data from within the app settings.
          </li>
          <li>
            <strong>Change your password:</strong> You can update your password
            at any time from within the app.
          </li>
        </ul>

        <h2 className="privacy-section-title">8. Children's Privacy</h2>
        <p>
          Steak & Eggs is not intended for use by children under the age of 13.
          We do not knowingly collect information from children under 13. If you
          believe a child has provided us with personal data, please contact us
          so we can remove it.
        </p>

        <h2 className="privacy-section-title">9. Simulated Trading Disclaimer</h2>
        <p>
          Steak & Eggs is a simulated trading platform. No real money is
          involved, no real securities are bought or sold, and no real financial
          transactions take place. The app is for educational and entertainment
          purposes only and should not be considered financial advice.
        </p>

        <h2 className="privacy-section-title">10. Changes to This Policy</h2>
        <p>
          We may update this Privacy Policy from time to time. We will notify
          users of any material changes by updating the "Last updated" date at
          the top of this page.
        </p>

        <h2 className="privacy-section-title">11. Contact Us</h2>
        <p>
          If you have any questions about this Privacy Policy, you can reach us
          at:
        </p>
        <p>
          <a href="mailto:ishmaan@hotmail.com">ishmaan@hotmail.com</a>
        </p>

        <div className="privacy-footer">
          <p>&copy; 2026 Steak & Eggs. All rights reserved.</p>
        </div>
      </div>
    </div>
  )
}

export default Privacy
