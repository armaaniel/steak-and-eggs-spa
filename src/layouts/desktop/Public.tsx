import { Outlet } from 'react-router-dom'
import { Link } from 'react-router-dom'
import '../../stylesheets/desktop/public.css'

function Public() {
	
	const token = localStorage.getItem('authToken')
	
	return (
	
	<>
	<header>
	<nav className='nav'>
	
	<div className='nav-left'>
	
		<Link to="/">
			<img src="/logo.svg" className='logo-desktop' alt='Steak & Eggs logo'/>
		</Link>
		
		
	</div>
	
	<div className='nav-right'>
	
	<Link to="/how-it-works" className='nav-text'>
		<span>How It Works</span>
	</Link>
	
	<Link to={token ? "/home" : "/login"} className='login-link'>
		Log In
	</Link>
	
	<Link to={token ? "/home" : "/signup"} className='login-link signup'>
		Sign Up
	</Link>
	
	</div>
		
	</nav>
	</header>
	
	<Outlet />
	
	</>
	)
}

export default Public;