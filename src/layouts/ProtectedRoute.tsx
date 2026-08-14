import '../stylesheets/authenticated.css'
import { Navigate, Outlet } from 'react-router-dom'
import Navbar from '../components/Navbar'

function ProtectedRoute() {
	const token = localStorage.getItem('authToken')
	
	if (!token) return <Navigate to ="/login" />
	
	return (
		<>
			<header><Navbar /></header>
			<Outlet />
		</>
		)
}

export default ProtectedRoute