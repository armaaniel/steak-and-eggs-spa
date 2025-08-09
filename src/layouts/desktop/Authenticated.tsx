import { useState, useEffect } from 'react';
import { Outlet, Navigate, NavLink, useNavigate } from 'react-router-dom'
import logo from '../../assets/logo.svg'
import Searchbar from '../../components/desktop/Searchbar'
import '../../stylesheets/desktop/authenticated.css'


function Authenticated() {
	
	const [isVerifying, setIsVerifying] = useState(true)
	const [isAuthenticated, setIsAuthenticated] = useState(false)
	
	const token = localStorage.getItem('authToken')
	const navigate = useNavigate();
	
	const handleLogout = () => {
		localStorage.removeItem('authToken')
		navigate('/')
	}
		
	
	useEffect(() => {
		async function verifyUser() {
			
			if (!token) {
				setIsVerifying(false)
				return
			}
			
			try {
				const response = await fetch('http://localhost:3000/verifytoken', {
					headers: {authToken: token}
				})
					if (response.ok) {
						setIsAuthenticated(true)
					} else {
						localStorage.removeItem('authToken')
					}
			} catch (error) {
				console.log(error)
				localStorage.removeItem('authToken')
			} finally {
				setIsVerifying(false)
			}
		}
		verifyUser();
	}, []);
	
	if (isVerifying) { 
		return (
		
		<header>
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
		</header>
		)
	}
	
	if (!isAuthenticated) return <Navigate to='/login'/>;
	
								
	return (
	
	<>
	<header>
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
	</header>
	
	<main className='home'>
	<Outlet />
	</main>
	
	</>
	)
}

export default Authenticated;