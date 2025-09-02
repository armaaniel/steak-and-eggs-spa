import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Outlet, NavLink } from 'react-router-dom'
import {resetConsumer} from '../../consumer.js'
import Navbar from '../../components/desktop/Navbar'
import NotFoundTwo from '../../components/desktop/NotFoundTwo'
import '../../stylesheets/desktop/authenticated.css'

function Stock() {
	
	const API = import.meta.env.VITE_API
	
	const [isVerifying, setIsVerifying] = useState(true)
		
	const [userData, setUserData] = useState(null)
	
	const [tickerData, setTickerData] = useState(null)
	
	const [tickerNotFound, setTickerNotFound] = useState(null)
	
	const [error, setError] = useState(null)
	
	const {symbol} = useParams();
	
	const token = localStorage.getItem('authToken')
	
	if (!token) {
	  window.location.href = '/login'
	  return null
	}
	
	async function getUserData() {
	    try {
	        const response = await fetch(`${API}/stocks/${symbol}/userdata`, {
	            headers: {authToken: token}
	        })
	        const data = await response.json()
			setUserData(data)
	    } catch (error) {
	        setUserData({position:null, balance:'N/A'})
	    }
	}	
	
	useEffect(() => {
		async function getData() {
			setTickerNotFound(null)
			try {				
				const [response1, response2] = await Promise.all([
				fetch(`${API}/stocks/${symbol}/tickerdata`, {
					headers: {authToken: token}
				}),
				fetch(`${API}/stocks/${symbol}/userdata`, {
					headers: {authToken: token}
				})
				
				])				
					if (response1.ok) {
						const data = await response1.json()
				        setTickerData(data)
					} else if (response1.status === 401) {
						localStorage.removeItem('authToken')
						resetConsumer()
						setUserData('')
					} else {
						setTickerNotFound(true)
					}
					
					if (response2.status === 401) {
						localStorage.removeItem('authToken')
						resetConsumer()
						setUserData('')
					}
					
					const data2 = await response2.json()
					setUserData(data2)
						
			} catch (error) {
				setError(error)
			} finally {
				setIsVerifying(false)
			}
		}
		getData();
	}, [symbol]);
	
	if (isVerifying) { 
		return (
		
		<header>
		<Navbar />
		</header>
		)
	}
	
	if (tickerNotFound || error) { 
		return (
		<>
		
		<header>
		<Navbar />
		</header>
		
		<main className='home'>
		<NotFoundTwo />
		</main>
		
		</>
		)
	}

							
	return (
	
	<>
	<header>
	<Navbar />
	</header>
	
	<main className='home'>
	<Outlet context={{getUserData, userData, tickerData}} />
	</main>
	
	</>
	)
}

export default Stock;