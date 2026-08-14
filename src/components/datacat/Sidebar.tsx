import { NavLink } from 'react-router-dom'

const Sidebar = () => {
  return (
    <div className="sidebar-button-container">
      <NavLink to="/datacat" end className={({ isActive }) => `side-button ${isActive ? 'active' : ''}`}>
        All Routes
      </NavLink>

      <NavLink to="/datacat/latent" className={({ isActive }) => `side-button ${isActive ? 'active' : ''}`}>
        Most Latent
      </NavLink>

      <NavLink to="/datacat/connections" className={({ isActive }) => `side-button ${isActive ? 'active' : ''}`}>
        Active Connections
      </NavLink>
    </div>
  )
}

export default Sidebar
