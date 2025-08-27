import { useNavigate, NavLink, Link } from 'react-router-dom'
import Searchbar from '../../components/desktop/Searchbar'
import {resetConsumer} from '../../consumer.js'

function Navbar() {
	
	const navigate = useNavigate();
	
	const handleLogout = () => {
		localStorage.removeItem('authToken');
		resetConsumer();
		navigate('/');
	}
	
	return (
	<nav className='nav-auth'>

	<div className='nav-left-auth'>

			<Link to="/home">
			<svg viewBox="0 0 364 224" xmlns="http://www.w3.org/2000/svg" className='logo-desktop' aria-label='Steak & Eggs logo'>
			  <ellipse cx="182" cy="112" rx="180" ry="110" fill="#f5f5f5" stroke="#d3d3d3" strokeWidth="4"/>
			  <path d="m122 82c-20-10 40-30 120 0 30 20 20 60-10 70-70 20-130 0-140-30-10-20 10-30 30-40" fill="#8b4513" stroke="#654321" strokeWidth="3"/>
			  <g stroke="#472400" strokeWidth="3"><path d="m142 92 60 10"/><path d="m162 112 60 10"/><path d="m152 132 60 10"/></g>
			  <circle cx="142" cy="62" r="35" fill="#fff" stroke="#e6e6e6" strokeWidth="2"/><circle cx="142" cy="62" r="12" fill="#ffd700"/>
			  <circle cx="232" cy="52" r="30" fill="#fff" stroke="#e6e6e6" strokeWidth="2"/><circle cx="232" cy="52" r="10" fill="#ffd700"/>
			  <text x="182" y="222" fill="#333333" fontFamily="Arial, sans-serif" fontSize="32px" fontWeight="bold" textAnchor="middle">STEAK &amp; EGGS</text>
			</svg>
			</Link>
	
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