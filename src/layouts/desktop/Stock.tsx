import { useState, useEffect } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { Outlet } from 'react-router-dom'
import {resetConsumer} from '../../consumer.ts'
import Navbar from '../../components/desktop/Navbar'
import NotFoundTwo from '../../components/desktop/NotFoundTwo'
import '../../stylesheets/desktop/authenticated.css'
import type { UserData, TickerData, Error }  from '../../types.ts'

function Stock() {
	
	const API:string = import.meta.env.VITE_API
		
	const [isVerifying, setIsVerifying] = useState(true)
		
	const [userData, setUserData] = useState<UserData | null>(null)
	
	const [tickerData, setTickerData] = useState<TickerData | null>(null)
	
	const [tickerNotFound, setTickerNotFound] = useState(false)
	
	const [error, setError] = useState<Error>(null)
	
	const {symbol} = useParams();
	
	const token = localStorage.getItem('authToken')
	
	async function getUserData() {
		if (!token) return
	    try {
	        const response = await fetch(`${API}/stocks/${symbol}/userdata`, {
	            headers: {authToken: token}
	        })
	        const data = await response.json()
			setUserData(data)
	    } catch (error) {
	        setUserData({balance:'N/A'})
	    }
	}	
	
	useEffect(() => {
		async function getData() {
			if (!token) return
			setTickerNotFound(false)
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
					} else {
						setTickerNotFound(true)
					}
					
					if (response2.status === 401) {
						localStorage.removeItem('authToken')
						resetConsumer()
					}
					
					const data2 = await response2.json()
					setUserData(data2)
						
			} catch (error) {
				setError(error as Error)
			} finally {
				setIsVerifying(false)
			}
		}
		getData();
	}, [symbol]);
	
	if (!token) { return <Navigate to='/login'/> }		
	
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
			<Navbar/>
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
		<Navbar/>
	</header>
	
	<main className='home'>
	<Outlet context={{getUserData, userData, tickerData}} />
	</main>
	
	</>
	)
}

export default Stock;