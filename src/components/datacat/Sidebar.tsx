import { NavLink } from 'react-router-dom'
import ThemeToggle from '../ThemeToggle'

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

      <NavLink to="/datacat/uptime" className={({ isActive }) => `side-button ${isActive ? 'active' : ''}`}>
        Uptime
      </NavLink>

      <NavLink to="/datacat/ingester" className={({ isActive }) => `side-button ${isActive ? 'active' : ''}`}>
        Ingester
      </NavLink>

      <ThemeToggle className="dc-theme-toggle" />
    </div>
  )
}

export default Sidebar
