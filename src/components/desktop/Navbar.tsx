import { useState, useRef, useEffect } from 'react'
import { NavLink, Link, useNavigate } from 'react-router-dom'
import Searchbar from '../../components/desktop/Searchbar'
import { resetConsumer } from '../../consumer.ts'


function Navbar() {
  const API: string = import.meta.env.VITE_API
	const USERNAME = localStorage.getItem('username')
  const navigate = useNavigate()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [showChangePassword, setShowChangePassword] = useState(false)
  const [showDeleteAccount, setShowDeleteAccount] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Change password state
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [cpError, setCpError] = useState<string | null>(null)
  const [cpSuccess, setCpSuccess] = useState<string | null>(null)
  const [cpSubmitting, setCpSubmitting] = useState(false)
  const [cpHasTyped, setCpHasTyped] = useState(false)

  // Delete account state
  const [deleteConfirmation, setDeleteConfirmation] = useState('')
  const [daError, setDaError] = useState<string | null>(null)
  const [daSubmitting, setDaSubmitting] = useState(false)
  const [daHasTyped, setDaHasTyped] = useState(false)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('authToken')
    resetConsumer()
    navigate('/')
  }

  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setCpHasTyped(false)
    setCpSuccess(null)
    setCpError(null)

    if (newPassword !== confirmPassword) {
      setCpError('New passwords do not match')
      return
    }
    if (newPassword.length === 0) {
      setCpError('New password must contain at least 1 character')
      return
    }

    setCpSubmitting(true)
    const token = localStorage.getItem('authToken')
    try {
      const response = await fetch(`${API}/change_password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', authToken: token } as HeadersInit,
        body: JSON.stringify({ new_password: newPassword }),
      })
      if (response.ok) {
        setCpSuccess('Password updated successfully')
      } else {
        const data = await response.json()
        setCpError(data.error || 'Something went wrong')
      }
    } catch {
      setCpError('Something went wrong, please try again')
    } finally {
      setCpSubmitting(false)
    }
  }

  const handleDeleteAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setDaHasTyped(false)
    if (deleteConfirmation.toLowerCase() !== 'delete') {
      setDaError('Please type "delete" to confirm')
      return
    }
    setDaError(null)
    setDaSubmitting(true)
    const token = localStorage.getItem('authToken')
    try {
      const response = await fetch(`${API}/delete_account`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', authToken: token } as HeadersInit,
      })
      if (response.ok) {
        handleLogout()
      } else {
        const data = await response.json()
        setDaError(data.error || 'Something went wrong')
      }
    } catch {
      setDaError('Something went wrong, please try again')
    } finally {
      setDaSubmitting(false)
    }
  }

  const closeChangePassword = () => {
    setShowChangePassword(false)
    setNewPassword('')
    setConfirmPassword('')
    setCpError(null)
    setCpSuccess(null)
    setCpSubmitting(false)
    setCpHasTyped(false)
  }

  const closeDeleteAccount = () => {
    setShowDeleteAccount(false)
    setDeleteConfirmation('')
    setDaError(null)
    setDaSubmitting(false)
    setDaHasTyped(false)
  }

  return (
    <>
      <nav className="nav-auth">
        <div className="nav-left-auth">
          <Link to="/home">
            <svg viewBox="0 0 364 224" xmlns="http://www.w3.org/2000/svg" className="logo-desktop" aria-label="Steak & Eggs logo">
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

          <div className="nav-auth-text-container">
            <NavLink to="/home" className={({ isActive }) => `nav-auth-text ${isActive ? 'active' : ''}`}>
              <span>Home</span>
            </NavLink>

            <NavLink to="/activity" className="nav-auth-text">
              <span>Activity</span>
            </NavLink>

            <NavLink to="/datacat" className="nav-auth-text">
              <span>DataCat</span>
            </NavLink>
						
						<a href="https://www.notion.so/Steak-Eggs-3487e61da1f98087811cd2dd38b7f662?source=copy_link" className="nav-auth-text" target="_blank" rel="noopener noreferrer">
	              <span>Architecture</span>
						</a>
							
          </div>
        </div>

        <div className="nav-right-auth">
          <Searchbar />

          <div className="profile-dropdown-wrapper" ref={dropdownRef}>
            <button
              className="login-link profile-trigger"
              onClick={() => setDropdownOpen(o => !o)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="8" r="4" />
                <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
              </svg>
            </button>

            {dropdownOpen && (
              <div className="profile-dropdown">
                <div className="profile-dropdown-username">{USERNAME}</div>
                <hr className="profile-dropdown-divider" />
                <button
                  className="profile-dropdown-item"
                  onClick={() => { setDropdownOpen(false); setShowChangePassword(true) }}
                >
                  Change Password
                </button>
                <button
                  className="profile-dropdown-item profile-dropdown-item--danger"
                  onClick={() => { setDropdownOpen(false); setShowDeleteAccount(true) }}
                >
                  Delete Account
                </button>
                <hr className="profile-dropdown-divider" />
                <button className="profile-dropdown-item" onClick={handleLogout}>
                  Log Out
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      {showChangePassword && (
        <div className="modal-overlay" onClick={closeChangePassword}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Change Password</h2>
              <button className="modal-close" onClick={closeChangePassword} aria-label="Close">&#x2715;</button>
            </div>
            <div className={`ls-error-container ${(cpSuccess || cpError) && !cpHasTyped && !cpSubmitting ? 'visible' : 'hidden'}`}>
              <p className={cpSuccess ? 'modal-success' : 'modal-error'}>{cpSuccess ?? cpError}</p>
            </div>
            <form className="modal-form" onSubmit={handleChangePasswordSubmit}>
              <div className="ls-input-container">
                <input
                  id="new-password"
                  type="password"
                  className="ls-input"
                  placeholder=" "
                  value={newPassword}
                  onChange={e => { setNewPassword(e.target.value); setCpHasTyped(true) }}
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
                  onChange={e => { setConfirmPassword(e.target.value); setCpHasTyped(true) }}
                />
                <label htmlFor="confirm-password" className="ls-label">Confirm New Password</label>
              </div>
              <div className="modal-actions">
                <button type="button" className="login-link" onClick={closeChangePassword}>
                  Cancel
                </button>
                <button type="submit" className={`login-link signup ${cpSubmitting ? 'submitting' : ''}`} disabled={cpSubmitting}>
                  Update Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDeleteAccount && (
        <div className="modal-overlay" onClick={closeDeleteAccount}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Delete Account</h2>
              <button className="modal-close" onClick={closeDeleteAccount} aria-label="Close">&#x2715;</button>
            </div>
            <p className="modal-danger-text">
              This action is permanent and cannot be undone. All your data, positions, and history will be deleted immediately.
            </p>
            <div className={`ls-error-container ${daError && !daHasTyped && !daSubmitting ? 'visible' : 'hidden'}`}>
              <p className="modal-error">{daError}</p>
            </div>
            <form className="modal-form" onSubmit={handleDeleteAccountSubmit}>
              <div className="ls-input-container">
                <input
                  id="delete-confirmation"
                  type="text"
                  className="ls-input"
                  placeholder=" "
                  value={deleteConfirmation}
                  onChange={e => { setDeleteConfirmation(e.target.value); setDaHasTyped(true) }}
                />
                <label htmlFor="delete-confirmation" className="ls-label">Type "delete" to confirm</label>
              </div>
              <div className="modal-actions">
                <button type="button" className="login-link" onClick={closeDeleteAccount}>
                  Cancel
                </button>
                <button type="submit" className={`login-link signup modal-delete-btn ${daSubmitting ? 'submitting' : ''}`} disabled={daSubmitting || deleteConfirmation.toLowerCase() !== 'delete'}>
                  Delete Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}

export default Navbar
