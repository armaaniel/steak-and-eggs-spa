import {useState} from 'react'
import { useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom'
import logo from '../../assets/logo.svg'
import '../../stylesheets/desktop/loginsignup.css'

function Login() {
	
	const API = import.meta.env.VITE_API || 'localhost:3000'
	
	const [isSubmitting, setIsSubmitting] = useState(false)
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
					<img src={logo} className='logo-desktop' alt='Steak & Eggs logo'/>
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
					
					<button type = 'submit' className='ls-submit' disabled={isSubmitting}>Log In</button>
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