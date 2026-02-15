import { NavLink } from 'react-router-dom'


const Sidebar = () => {
	
	return (
	
		<div className='sidebar-button-container'>
	
		<NavLink to="/datacat" end className={ ({ isActive }) => isActive ? "side-button-active" : "side-button"}>
			All Routes
		</NavLink>

		<NavLink to="/datacat/latent" className={({ isActive }) => isActive ? "side-button-active" : "side-button"}>
			Most Latent
		</NavLink>

		<NavLink to="/datacat/connections" className={({ isActive }) => isActive ? "side-button-active" : "side-button"}>
	  		Active Connections
		</NavLink>
		</div>
	)
}

export default Sidebar;
