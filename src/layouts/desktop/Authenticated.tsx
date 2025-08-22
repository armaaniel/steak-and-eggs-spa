import { useState, useEffect } from 'react';
import { Outlet, Navigate, NavLink} from 'react-router-dom'
import {resetConsumer} from '../../consumer.js'
import Navbar from '../../components/desktop/Navbar'
import '../../stylesheets/desktop/authenticated.css'


function Authenticated() {
	
	const [isVerifying, setIsVerifying] = useState(true)
	
	const [isAuthenticated, setIsAuthenticated] = useState(false)
	
	const token = localStorage.getItem('authToken')	
	
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
						resetConsumer()
					}
			} catch (error) {
				localStorage.removeItem('authToken')
				resetConsumer()
			} finally {
				setIsVerifying(false)
			}
		}
		verifyUser();
	}, []);
	
	if (isVerifying) { 
		return (
		
		<header>
			<Navbar />
		</header>
		)
	}
	
	if (!isAuthenticated) return <Navigate to='/login'/>;
								
	return (
	
	<>
	<header>
		<Navbar />
	</header>
	
	<main className='home'>
		<Outlet />
	</main>
	
	</>
	)
}

export default Authenticated;