import '../../stylesheets/desktop/howitworks.css'
import logo from '../../assets/logo.svg'
import { Link } from 'react-router-dom';

function NotFoundTwo() {
	
	const token = localStorage.getItem('authToken')
	
	return (
	
	<div className='four-main'>
	
		<div className='howto-parent four'>
			
			<div className='howto-header four'>
				<h1>Page cannot be found <br />Click our logo  <br /> To go back to the app  </h1>
			</div>
			
			<div>
				<Link to={token ? "/home" : "/"}>
					<img src={logo} className='logo-desktop four' alt='Steak & Eggs logo'/>
				</Link>
			</div>
		</div>
			
	</div>
	)
}

export default NotFoundTwo;
