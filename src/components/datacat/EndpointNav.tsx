import { NavLink } from 'react-router-dom'
import { toRouteLabel } from '../../lib/utils.ts'

interface NavProps {
  method: string | undefined
  path: string | undefined
  endpoint: string
}

const EndpointNav = ({ method, path, endpoint }: NavProps) => {
  return (
    <div className="endpoint-header-container">
      <NavLink to={`/datacat/${method}/${path}`} className={({ isActive }) => `nav-button ${isActive ? 'active' : ''}`}>
        {toRouteLabel(endpoint)}
      </NavLink>
    </div>
  )
}

export default EndpointNav
