import { NavLink } from 'react-router-dom';

interface NavProps {
	method: string | undefined
	path: string | undefined
	endpoint: string
	showCache: boolean
	apiBoolean: boolean
}

const EndpointNav = ({method, path, endpoint, showCache, apiBoolean}: NavProps) => {
	
	return (
	
	<div className='endpoint-header-container'>
	<NavLink to={`/datacat/${method}/${path}`} className={ ({ isActive }) => isActive ? "nav-button-active" : "nav-button"}
	state={{showCache: showCache, apiBoolean: apiBoolean }}>
		{endpoint}
	</NavLink>
	
	<NavLink 
	  to={`/datacat/cache/${method}/${path}`} 
	  className={({ isActive }) => `${isActive ? "nav-button-active" : "nav-button"} ${showCache ? "cache-visible" : "cache-hidden"}`}
	  state={{ showCache: showCache, apiBoolean: apiBoolean }} tabIndex={showCache ? 0 : -1}>
	  {apiBoolean ? "Cache vs API" : "Cache vs DB"}
	</NavLink>
	</div>
	)
}

export default EndpointNav;