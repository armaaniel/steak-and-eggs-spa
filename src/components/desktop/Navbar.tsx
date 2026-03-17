import { useState, useRef, useEffect } from 'react'
import { NavLink, Link, useNavigate } from 'react-router-dom'
import Searchbar from '../../components/desktop/Searchbar'
import { resetConsumer } from '../../consumer.ts'

const USERNAME = localStorage.getItem('username')

function Navbar() {
  const navigate = useNavigate()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [showChangePassword, setShowChangePassword] = useState(false)
  const [showDeleteAccount, setShowDeleteAccount] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [deletePassword, setDeletePassword] = useState('')

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

  const handleChangePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // TODO: Call API to change password
    closeChangePassword()
  }

  const handleDeleteAccountSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // TODO: Call API to delete account
    closeDeleteAccount()
  }

  const closeChangePassword = () => {
    setShowChangePassword(false)
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
  }

  const closeDeleteAccount = () => {
    setShowDeleteAccount(false)
    setDeletePassword('')
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
            <h2 className="modal-title">Change Password</h2>
            <form className="modal-form" onSubmit={handleChangePasswordSubmit}>
              <div className="ls-input-container">
                <input
                  id="current-password"
                  type="password"
                  className="ls-input"
                  placeholder=" "
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  required
                />
                <label htmlFor="current-password" className="ls-label">Current Password</label>
              </div>
              <div className="ls-input-container">
                <input
                  id="new-password"
                  type="password"
                  className="ls-input"
                  placeholder=" "
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  required
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
                  onChange={e => setConfirmPassword(e.target.value)}
                  required
                />
                <label htmlFor="confirm-password" className="ls-label">Confirm New Password</label>
              </div>
              <div className="modal-actions">
                <button type="button" className="login-link" onClick={closeChangePassword}>
                  Cancel
                </button>
                <button type="submit" className="login-link signup">
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
            <h2 className="modal-title">Delete Account</h2>
            <p className="modal-danger-text">
              This action is permanent and cannot be undone. All your data, positions, and history will be deleted immediately.
            </p>
            <form className="modal-form" onSubmit={handleDeleteAccountSubmit}>
              <div className="ls-input-container">
                <input
                  id="delete-password"
                  type="password"
                  className="ls-input"
                  placeholder=" "
                  value={deletePassword}
                  onChange={e => setDeletePassword(e.target.value)}
                  required
                />
                <label htmlFor="delete-password" className="ls-label">Enter your password to confirm</label>
              </div>
              <div className="modal-actions">
                <button type="button" className="login-link" onClick={closeDeleteAccount}>
                  Cancel
                </button>
                <button type="submit" className="login-link signup modal-delete-btn">
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
