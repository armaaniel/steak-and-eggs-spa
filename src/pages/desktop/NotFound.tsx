import '../../stylesheets/desktop/howitworks.css'
import { Link } from 'react-router-dom';

function NotFound() {
	
	const token = localStorage.getItem('authToken')
	
	return (
	
	<>
	
	<header>
		<nav className='nav'>
			<Link to={token ? "/home" : "/"}>
				<img src="/logo.svg" className='logo-desktop' alt='Steak & Eggs logo'/>
			</Link>
		</nav>
	</header>
	
	<div className='four-main'>
	
		<div className='howto-parent four'>
			
			<div className='howto-header four'>
				<h1>Page cannot be found <br />Click our logo  <br /> To go back to the app  </h1>
			</div>
			
			<div>
				<Link to={token ? "/home" : "/"}>
					<img src="/logo.svg" className='logo-desktop four' alt='Steak & Eggs logo'/>
				</Link>
			</div>
		</div>
			
	</div>
	</>
	)
}

export default NotFound;
