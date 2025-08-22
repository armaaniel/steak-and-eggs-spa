import '../../stylesheets/desktop/howitworks.css'
import { Link } from 'react-router-dom';

function HowItWorks() {
	
	return (
	
	<div className='howto-main'>
	
		<div className='howto-parent'>
			<div>
			</div>
	
			<div className='howto-header'>
				<h1>A stock trading simulator <br />with close to real market conditions <br />and no real money involved </h1>
			</div>
		
			<div className='howto-body'>
				<Link to='/signup' className='howto-create'>Create an account</Link>	
				<p>Add funds to your account</p>
				<p>Purchase stocks and track your gains and losses in real time</p>
			</div>
			<Link to='/signup' className='login-link signup howto'>Get Started</Link>		
		</div>
			
	</div>
	)
}

export default HowItWorks;
