import { useState } from 'react'
import apiFetch from '../lib/apiFetch'

interface Props {
  onClose: () => void
}

const ChangePasswordModal = ({ onClose }: Props) => {
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [hasTyped, setHasTyped] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setHasTyped(false)
    setSuccess(null)
    setError(null)

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match')
      return
    }
    if (newPassword.length === 0) {
      setError('New password must contain at least 1 character')
      return
    }

    setIsSubmitting(true)
    try {
      const response = await apiFetch('/change_password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ new_password: newPassword }),
      })
      if (!response) return
      if (response.ok) {
        setSuccess('Password updated successfully')
      } else {
        const data = await response.json()
        setError(data.error || 'Something went wrong')
      }
    } catch {
      setError('Something went wrong, please try again')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Change Password</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">&#x2715;</button>
        </div>
        <div className={`ls-error-container ${(success || error) && !hasTyped && !isSubmitting ? 'visible' : 'hidden'}`}>
          <p className={success ? 'modal-success' : 'modal-error'}>{success ?? error}</p>
        </div>
        <form className="modal-form" onSubmit={handleSubmit}>
          <div className="ls-input-container">
            <input
              id="new-password"
              type="password"
              className="ls-input"
              placeholder=" "
              value={newPassword}
              onChange={e => { setNewPassword(e.target.value); setHasTyped(true) }}
            />
            <label htmlFor="new-password" className="ls-label">New Password</label>
          </div>
          <div className="ls-input-container">
            <input
              id="confirm-password"
              type="password"
              className="ls-input"
              placeholder=" "
              value={confirmPassword}
              onChange={e => { setConfirmPassword(e.target.value); setHasTyped(true) }}
            />
            <label htmlFor="confirm-password" className="ls-label">Confirm New Password</label>
          </div>
          <div className="modal-actions">
            <button type="button" className="login-link" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className={`login-link signup ${isSubmitting ? 'submitting' : ''}`} disabled={isSubmitting}>
              Update Password
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ChangePasswordModal
