import { NavLink } from 'react-router-dom'

const DCNavbar = () => {
	
	const authBoolean = !!localStorage.getItem('authToken')
	
  return (
    <div className="navbar">
      <NavLink to="/datacat" className="catlas-text">
        DataCat
      </NavLink>
      <NavLink to={authBoolean ? '/home' : '/'} className="catlas-text">
        Steak&Eggs
      </NavLink>
    </div>
  )
}

export default DCNavbar
