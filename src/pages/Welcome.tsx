import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import '../stylesheets/welcome.css'

function Welcome() {
  const navigate = useNavigate()
  const API: string = import.meta.env.VITE_API

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<null | string>(null)

  async function handleTryDemo() {
    try {
      setIsSubmitting(true)
      const response = await fetch(`${API}/demo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
    <>
      <div className="welcome-main-desktop">
        <h1 className="welcome-heading-desktop"> The best place to paper trade </h1>

        <div className="welcome-start-desktop">
          <button className="login-link signup desktop" disabled={isSubmitting} onClick={handleTryDemo}>
            Try Demo
          </button>
          <div className={`welcome-error ${error && !isSubmitting ? 'visible' : 'hidden'}`}>
            <p className="ls-heading error">{error}</p>
          </div>
        </div>
      </div>
    </>
  )
}

export default Welcome
