import { useState, useRef } from 'react'
import { NavLink, Link, useNavigate } from 'react-router-dom'
import Searchbar from './Searchbar'
import Logo from './Logo'
import ChangePasswordModal from './ChangePasswordModal'
import DeleteAccountModal from './DeleteAccountModal'
import { resetConsumer } from '../lib/consumer.ts'
import { useAuth } from '../lib/auth'
import useClickOutside from '../hooks/useClickOutside'
import { currentTheme, toggleTheme } from '../lib/theme'


function Navbar() {
	const USERNAME = localStorage.getItem('username')
  const navigate = useNavigate()
  const { setToken } = useAuth()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [openModal, setOpenModal] = useState<'password' | 'delete' | null>(null)
  const [theme, setTheme] = useState(currentTheme)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useClickOutside(dropdownRef, () => setDropdownOpen(false))

  const handleLogout = () => {
    localStorage.removeItem('authToken')
    localStorage.removeItem('username')
    resetConsumer()
    setToken(null)
    navigate('/')
  }

  return (
    <>
      <nav className="nav">
        <div className="nav-left">
          <div className="nav-brand">
            <Link to="/home" className="nav-logo">
              <Logo />
            </Link>
            <NavLink to="/home" end className={({ isActive }) => `nav-brand-text ${isActive ? 'active' : ''}`}>Home</NavLink>
          </div>

          <div className="nav-links">
            <NavLink to="/activity" className={({ isActive }) => `nav-text ${isActive ? 'active' : ''}`}>
              <span>Activity</span>
            </NavLink>

            <NavLink to="/datacat" className={({ isActive }) => `nav-text ${isActive ? 'active' : ''}`}>
              <span>DataCat</span>
            </NavLink>

          </div>
        </div>

        <div className="nav-right with-search">
          <Searchbar />

          <div className="profile-dropdown-wrapper" ref={dropdownRef}>
            <button
              className="btn btn-secondary profile-trigger"
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
                <button className="profile-dropdown-item" onClick={() => setTheme(toggleTheme())}>
                  {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
                </button>
                <button
                  className="profile-dropdown-item"
                  onClick={() => { setDropdownOpen(false); setOpenModal('password') }}
                >
                  Change Password
                </button>
                <button
                  className="profile-dropdown-item profile-dropdown-item--danger"
                  onClick={() => { setDropdownOpen(false); setOpenModal('delete') }}
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

      {openModal === 'password' && <ChangePasswordModal onClose={() => setOpenModal(null)} />}
      {openModal === 'delete' && <DeleteAccountModal onClose={() => setOpenModal(null)} onDeleted={handleLogout} />}
    </>
  )
}

export default Navbar
