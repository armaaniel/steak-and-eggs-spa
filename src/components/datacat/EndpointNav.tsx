import { NavLink } from 'react-router-dom'
import { toRouteLabel } from '../../lib/utils.ts'

interface NavProps {
  method: string | undefined
  path: string | undefined
  endpoint: string
  showCache: boolean
  apiBoolean: boolean
}

const EndpointNav = ({ method, path, endpoint, showCache, apiBoolean }: NavProps) => {
  return (
    <div className="endpoint-header-container">
      <NavLink to={`/datacat/${method}/${path}`} className={({ isActive }) => `nav-button ${isActive ? 'active' : ''}`}>
        {toRouteLabel(endpoint)}
      </NavLink>

      <NavLink to={`/datacat/cache/${method}/${path}`} className={({ isActive }) => `nav-button ${isActive ? 'active' : ''} ${showCache ? 'cache-visible' : 'cache-hidden'}`} tabIndex={showCache ? 0 : -1}>
        {apiBoolean ? 'Cache vs API' : 'Cache vs DB'}
      </NavLink>
    </div>
  )
}

export default EndpointNav
