import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Link } from 'react-router-dom'
import '../stylesheets/loginsignup.css'
import useTryDemo from '../hooks/useTryDemo'
import Logo from '../components/Logo'

interface AuthFormProps {
  mode: 'login' | 'signup'
}

function AuthForm({ mode }: AuthFormProps) {
  const navigate = useNavigate()
  const API: string = import.meta.env.VITE_API

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<null | string>(null)
  const [hasTyped, setHasTyped] = useState(false)

  const { tryDemo: handleTryDemo, isSubmitting: isDemoSubmitting, error: demoError } = useTryDemo()

  const isLogin = mode === 'login'

  const validateUsername = (username: string) => {
    if (username.length > 20) return 'Username must be 20 characters or less'
    if (!/^[a-zA-Z0-9_]+$/.test(username)) return 'Username can only contain letters, numbers, and underscores'
    return null
  }

  const validatePassword = (password: string) => {
    if (password.length === 0) return 'Password must contain at least 1 character'
    return null
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setHasTyped(false)

    if (!isLogin) {
      const usernameError = validateUsername(username)
      const passwordError = validatePassword(password)
      if (usernameError) { setError(usernameError); return }
      if (passwordError) { setError(passwordError); return }
    }

    try {
      setIsSubmitting(true)
      const response = await fetch(`${API}/${mode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password }),
      })

      if (response.ok) {
        const data = await response.json()
        localStorage.setItem('authToken', data.token)
        localStorage.setItem('username', data.username)
        navigate('/home')
      } else {
        const errorData = await response.json()
        setError(errorData.error)
      }
    } catch {
      setError('Something went wrong, please try again')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="ls-desktop">
      <div className='ls-left'>
        <div className="ls-logo-desktop">
          <Link to="/">
            <Logo />
          </Link>
        </div>
        {!isLogin && (
          <div className="ls-try-demo-container">
            <span className={`ls-try-demo ${isDemoSubmitting ? 'submitting' : ''}`} onClick={!isDemoSubmitting ? handleTryDemo : undefined}>
              Try Demo
            </span>
            <div className={`ls-demo-error-container ${demoError && !isDemoSubmitting ? 'visible' : 'hidden'}`}>
              <p className="ls-heading error">{demoError}</p>
            </div>
          </div>
        )}
      </div>

      <div className="ls-right">
        <div className="ls-container">
          <div className="ls-form-container">
            <h2 className="ls-heading">{isLogin ? 'Welcome Back' : 'Sign Up'}</h2>

						<div className={`ls-error-container ${error && !isSubmitting && !hasTyped ? 'visible' : 'hidden'}`}>
							<p className="ls-heading error">{error}</p>
            </div>

            <form className="ls-form" onSubmit={handleSubmit}>
              <div className="ls-input-container">
                <input
                  type="text"
                  name="username"
                  id="username"
                  className="ls-input"
                  placeholder=" "
                  onChange={(e) => { setUsername(e.target.value); setHasTyped(true) }}
                />
                <label htmlFor="username" className="ls-label">Username</label>
              </div>

              <div className="ls-input-container">
                <input
                  type="password"
                  name="password"
                  id="password"
                  className="ls-input"
                  placeholder=" "
                  onChange={(e) => { setPassword(e.target.value); setHasTyped(true) }}
                />
                <label htmlFor="password" className="ls-label">Password</label>
              </div>

              <button type="submit" className="login-link signup login" disabled={isSubmitting}>
                {isLogin ? 'Log In' : 'Sign Up'}
              </button>
            </form>

            <p className="ls-footer">
              {isLogin ? "Don't have an account? " : 'Already have an account? '}
              <Link to={isLogin ? '/signup' : '/login'} className="ls-signup">
                {isLogin ? 'Sign Up' : 'Login'}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AuthForm
