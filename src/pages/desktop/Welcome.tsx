import '../../stylesheets/desktop/welcome.css'
import { Link } from 'react-router-dom'


function Welcome() {
	
	return (
	
	<div className='welcome-main-desktop'>	
	
		<h1 class='welcome-heading-desktop'> The best place to paper trade </h1>
		
		<div className='welcome-start-desktop'>
		
			<Link to='/signup' className='login-link signup desktop'>
				Get Started
			</Link>	
		
		</div>
	
	</div>
	
	
	
	);
}

export default Welcome;
	