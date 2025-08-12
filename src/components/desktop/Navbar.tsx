import { useNavigate, NavLink } from 'react-router-dom'
import Searchbar from '../../components/desktop/Searchbar'
import logo from '../../assets/logo.svg'

function Navbar() {
	
	const navigate = useNavigate();
	
	const handleLogout = () => {
		localStorage.removeItem('authToken')
		navigate('/')
	}
	
	return (
	<nav className='nav-auth'>

	<div className='nav-left-auth'>

		<div>
			<NavLink to="/home">
				<img src={logo} className='logo-desktop' alt='Steak & Eggs logo'/>
			</NavLink>
		</div>
	
		<div className='nav-auth-text-container'>
			<NavLink to="/home" className={ ({ isActive }) => `nav-auth-text ${isActive ? "active" : ""}`}>
				<span>Home</span>
			</NavLink>
	
			<NavLink to="/activity" className='nav-auth-text'>
				<span>Activity</span>
			</NavLink>
		</div>
	
	</div>

	<div className='nav-right-auth'>

		<Searchbar />

		<NavLink to="/" className='login-link' onClick={handleLogout}>
			Log Out
		</NavLink>

	</div>
	
	</nav>
	)
	
}

export default Navbar;