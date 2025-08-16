import {useState} from 'react'
import { useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom'
import logo from '../../assets/logo.svg'
import '../../stylesheets/desktop/loginsignup.css'

function Signup() {
	
	const [username, setUsername] = useState('')
	const [password, setPassword] = useState('')
	
    const navigate = useNavigate();
	
	async function handleSubmit(e) { 
		e.preventDefault()
		try {
			const response = await fetch('http://localhost:3000/signup', {
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
			console.error('Signup Failed')
		}
	} catch (error) {
		console.error('Error', error)
	}
}
	
	return (
	
	<div className='ls-desktop'>
		<div className='signup-left'>
		
			<div className='ls-logo-desktop'>
				<Link to="/">
					<img src={logo} className='logo-desktop' alt='Steak & Eggs logo'/>
				</Link>
			</div>
			
		</div>
		
		<div className='ls-right'>
		
			<div className='ls-container'>
				<div className='ls-form-container'>
				
				<h2 className='ls-heading'> Sign Up </h2>
				
				<form className= 'ls-form' onSubmit={handleSubmit}>
					<div className='ls-input-container'>
						<input type='text' name='username' className='ls-input' placeholder=' '
						onChange={(e) => setUsername(e.target.value)}/>
						<label htmlFor='username' className='ls-label'>Username</label>
					</div>
					
					<div className='ls-input-container'>
						<input type='password' name='password' className='ls-input' placeholder=' '
						onChange={(e) => setPassword(e.target.value)}/>
						<label htmlFor='password' className='ls-label'>Password</label>
					</div>
					
					<input type = 'submit' value='Sign Up' className='ls-submit'/>
				</form>
				
				<p className='ls-footer'>Already have an account? <Link to="/login" className='ls-signup'> 
				Login </Link> </p>
				
				</div>
			</div>
		</div>
	</div>
	
	)	
}

export default Signup;