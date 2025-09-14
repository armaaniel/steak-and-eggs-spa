import {useState} from 'react'
import { useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom'
import '../../stylesheets/desktop/loginsignup.css'

function Login() {
	
	const API = import.meta.env.VITE_API
	
	const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
	const [username, setUsername] = useState('')
	const [password, setPassword] = useState('')
	const [error, setError] = useState(null)
	
    const navigate = useNavigate();
	
	async function handleSubmit(e) { 
		e.preventDefault()
		setError(null)
		try {
			setIsSubmitting(true)
			const response = await fetch(`${API}/login`, {
			method: 'POST', 
			headers: {'Content-Type':'application/json'},
			body: JSON.stringify({username:username, password:password})
		})
		
		if (response.ok) {
			const data = await response.json()
			localStorage.setItem('authToken', data.token)
			navigate('/home')
		} else {
			const errorData = await response.json()
			setTimeout(() => {
				setError(errorData.error)
			}, 100)
		}
	} catch (error) {
		setError("Something went wrong, please try again")
	} finally {
		setIsSubmitting(false)
	}
}
	
	return (
	
	<div className='ls-desktop'>
		<div className='login-left'>
		
			<div className='ls-logo-desktop'>
				<Link to="/">
				<svg viewBox="0 0 364 224" xmlns="http://www.w3.org/2000/svg" className='logo-desktop' aria-label='Steak & Eggs logo'>
				  <ellipse cx="182" cy="112" rx="180" ry="110" fill="#f5f5f5" stroke="#d3d3d3" strokeWidth="4"/>
				  <path d="m122 82c-20-10 40-30 120 0 30 20 20 60-10 70-70 20-130 0-140-30-10-20 10-30 30-40" fill="#8b4513" stroke="#654321" strokeWidth="3"/>
				  <g stroke="#472400" strokeWidth="3"><path d="m142 92 60 10"/><path d="m162 112 60 10"/><path d="m152 132 60 10"/></g>
				  <circle cx="142" cy="62" r="35" fill="#fff" stroke="#e6e6e6" strokeWidth="2"/><circle cx="142" cy="62" r="12" fill="#ffd700"/>
				  <circle cx="232" cy="52" r="30" fill="#fff" stroke="#e6e6e6" strokeWidth="2"/><circle cx="232" cy="52" r="10" fill="#ffd700"/>
				  <text x="182" y="222" fill="#333333" fontFamily="Arial, sans-serif" fontSize="32px" fontWeight="bold" textAnchor="middle">STEAK &amp; EGGS</text>
				</svg>
				</Link>
			</div>
			
		</div>
		
		<div className='ls-right'>
		
			<div className='ls-container'>
				<div className='ls-form-container'>
				
				<h2 className='ls-heading'> Welcome Back </h2>
				
				{error && !isSubmitting && (
					<div className='ls-error-container'>
						<div className='ls-error'>
							<p className='ls-heading error'>{error}</p>
						</div>
					</div>
				)}
								
				<form className= 'ls-form' onSubmit={handleSubmit}>
					<div className='ls-input-container'>
						<input type='text' name='username' className='ls-input' placeholder=' '
						onChange={(e) => { 
							setUsername(e.target.value)
							setError(null)}}/>
						<label htmlFor='username' className='ls-label'>Username</label>
					</div>
					
					<div className='ls-input-container'>
						<input type='password' name='password' className='ls-input' placeholder=' '
						onChange={(e) => { 
							setPassword(e.target.value)
							setError(null)}}/>
							<label htmlFor='password' className='ls-label'>Password</label>
					</div>
					
					<button type = 'submit' className='login-link signup login' disabled={isSubmitting}>Log In</button>
				</form>
				
				<p className='ls-footer'>Don't have an account? <Link to="/signup" className='ls-signup'> 
				Sign Up </Link> </p>
				
				</div>
			</div>
		</div>
	</div>
	
	)	
}

export default Login;