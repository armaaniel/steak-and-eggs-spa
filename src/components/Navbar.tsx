import { useState, useRef, useEffect } from 'react'
import { NavLink, Link, useNavigate } from 'react-router-dom'
import Searchbar from './Searchbar'
import Logo from './Logo'
import ChangePasswordModal from './ChangePasswordModal'
import DeleteAccountModal from './DeleteAccountModal'
import { resetConsumer } from '../lib/consumer.ts'


function Navbar() {
	const USERNAME = localStorage.getItem('username')
  const navigate = useNavigate()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [openModal, setOpenModal] = useState<'password' | 'delete' | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

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
    localStorage.removeItem('username')
    resetConsumer()
    navigate('/')
  }

  return (
    <>
      <nav className="nav-auth">
        <div className="nav-left-auth">
          <Link to="/home">
            <Logo />
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
