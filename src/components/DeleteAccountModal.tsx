import { useState } from 'react'
import apiFetch from '../lib/apiFetch'

interface Props {
  onClose: () => void
  onDeleted: () => void
}

export default function DeleteAccountModal({ onClose, onDeleted }: Props) {
  const [confirmation, setConfirmation] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [hasTyped, setHasTyped] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setHasTyped(false)
    if (confirmation.toLowerCase() !== 'delete') {
      setError('Please type "delete" to confirm')
      return
    }
    setError(null)
    setIsSubmitting(true)
    try {
      const response = await apiFetch('/delete_account', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      })
      if (!response) return
      if (response.ok) {
        onDeleted()
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
          <h2 className="modal-title">Delete Account</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">&#x2715;</button>
        </div>
        <p className="modal-danger-text">
          This action is permanent and cannot be undone. All your data, positions, and history will be deleted immediately.
        </p>
        <div className={`ls-error-container ${error && !hasTyped && !isSubmitting ? 'visible' : 'hidden'}`}>
          <p className="modal-error">{error}</p>
        </div>
        <form className="modal-form" onSubmit={handleSubmit}>
          <div className="ls-input-container">
            <input
              id="delete-confirmation"
              type="text"
              className="ls-input"
              placeholder=" "
              value={confirmation}
              onChange={e => { setConfirmation(e.target.value); setHasTyped(true) }}
            />
            <label htmlFor="delete-confirmation" className="ls-label">Type "delete" to confirm</label>
          </div>
          <div className="modal-actions">
            <button type="button" className="login-link" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className={`login-link signup modal-delete-btn ${isSubmitting ? 'submitting' : ''}`} disabled={isSubmitting || confirmation.toLowerCase() !== 'delete'}>
              Delete Account
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
