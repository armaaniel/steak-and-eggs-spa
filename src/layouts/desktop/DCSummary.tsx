import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from '../../components/desktop/Sidebar'
import DCNavbar from '../../components/desktop/DCNavbar'
import '../../stylesheets/desktop/datacat.css'

function DCSummary() {
	
	const location = useLocation()
	
	const authBoolean = location.state?.authBoolean as boolean | undefined
	
	return (
	
	<>
	
	<DCNavbar authBoolean={authBoolean}/>
	
	<div className='dc-home-parent'>
	
	<div className='dc-home-left'>
		<Sidebar/>
	</div>	
	
	<div className='dc-home-right'>
    	<Outlet />
	</div>
	
	</div>
	
	</>
	
	
	)

}

export default DCSummary;
