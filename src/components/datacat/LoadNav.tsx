import { NavLink } from 'react-router-dom'

const LoadNav = () => {
  return (
    <div className="endpoint-header-container">
      <NavLink to="/datacat/load/http" className={({ isActive }) => `nav-button ${isActive ? 'active' : ''}`}>
        HTTP
      </NavLink>

      <NavLink to="/datacat/load/ws" className={({ isActive }) => `nav-button ${isActive ? 'active' : ''}`}>
        WS
      </NavLink>
    </div>
  )
}

export default LoadNav
