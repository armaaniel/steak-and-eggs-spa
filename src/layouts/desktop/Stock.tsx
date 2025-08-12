import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Outlet, Navigate, NavLink } from 'react-router-dom'
import Navbar from '../../components/desktop/Navbar'
import '../../stylesheets/desktop/authenticated.css'


function Stock() {
	
	const [isVerifying, setIsVerifying] = useState(true)
	
	const [isAuthenticated, setIsAuthenticated] = useState(false)
	
	const [balance, setBalance] = useState(null)
	
	const [position, setPosition] = useState(null)
	
	const {symbol} = useParams();
	
	const token = localStorage.getItem('authToken')
	
	async function getUserData() {
	    try {
	        const response = await fetch(`http://localhost:3000/stocks/${symbol}/userdata`, {
	            headers: {authToken: token}
	        })
	        const data = await response.json()
        
	        setPosition(data.position)
			setBalance(data.balance)
	    } catch (error) {
	        console.error(error)
	    }
	}	
	
	useEffect(() => {
		async function verifyUser() {

			if (!token) {
				setIsVerifying(false)
				return
			}
			
			try {
				const [response1, response2] = await Promise.all([
				fetch('http://localhost:3000/verifytoken', {
					headers: {authToken: token}
				}),
				fetch(`http://localhost:3000/stocks/${symbol}/userdata`, {
					headers: {authToken: token}
				})
				
				])
				const data = await response2.json()
		        setBalance(data.balance)
				setPosition(data.position)
				console.log(data)
				
					if (response1.ok && response2.ok) {
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
	}, [symbol]);
	
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
	<Outlet context={{getUserData, position, setPosition, balance, setBalance}} />
	</main>
	
	</>
	)
}

export default Stock;