import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Outlet, Navigate, NavLink } from 'react-router-dom'
import {resetConsumer} from '../../consumer.js'
import Navbar from '../../components/desktop/Navbar'
import '../../stylesheets/desktop/authenticated.css'


function Stock() {
	
	const [isVerifying, setIsVerifying] = useState(true)
	
	const [isAuthenticated, setIsAuthenticated] = useState(false)
	
	const [userData, setUserData] = useState(null)
	
	const {symbol} = useParams();
	
	const token = localStorage.getItem('authToken')
	
	async function getUserData() {
	    try {
	        const response = await fetch(`http://localhost:3000/stocks/${symbol}/userdata`, {
	            headers: {authToken: token}
	        })
	        const data = await response.json()
			setUserData(data)
	    } catch (error) {
	        setUserData({position:null, balance:'N/A'})
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
					if (response1.ok) {
						const data = await response2.json()
				        setUserData(data)
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
	<Outlet context={{getUserData, userData, setUserData}} />
	</main>
	
	</>
	)
}

export default Stock;