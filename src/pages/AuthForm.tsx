import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Link, Navigate } from 'react-router-dom'
import '../stylesheets/loginsignup.css'
import { useAuth } from '../lib/auth'

interface AuthFormProps {
  mode: 'login' | 'signup'
}

function AuthForm({ mode }: AuthFormProps) {
  const navigate = useNavigate()
  const { token, setToken } = useAuth()
  const API: string = import.meta.env.VITE_API

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<null | string>(null)
  const [hasTyped, setHasTyped] = useState(false)

  if (token) return <Navigate to="/home" replace />

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
        setToken(data.token)
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
      <Link to="/" className="ls-back" aria-label="Back to home">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="m12 19-7-7 7-7" />
          <path d="M22 12H5" />
        </svg>
      </Link>

      <div className="ls-form-container">
        <h2 className="ls-heading">{isLogin ? 'Login' : 'Sign Up'}</h2>

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

          <button type="submit" className="btn btn-primary auth-submit" disabled={isSubmitting}>
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
  )
}

export default AuthForm
