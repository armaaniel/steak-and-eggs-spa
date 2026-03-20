import '../../stylesheets/desktop/privacy.css'

function DeleteAccount() {
  return (
    <div className="privacy-main">
      <div className="privacy-parent">
        <h1 className="privacy-header">Delete Your Account</h1>

        <p>
          To delete your Steak N Eggs account and all associated data, open the
          app and go to Settings &gt; Delete Account. You'll be asked to confirm
          your password, and your account will be permanently deleted.
        </p>

        <p>
          If you're unable to access the app, email us at{' '}
          <a href="mailto:ishmaan@hotmail.com">ishmaan@hotmail.com</a> with the
          username associated with your account. We'll verify your identity and
          delete your account.
        </p>

        <div className="privacy-footer">
          <p>&copy; 2026 Steak & Eggs. All rights reserved.</p>
        </div>
      </div>
    </div>
  )
}

export default DeleteAccount
