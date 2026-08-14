import { Outlet } from 'react-router-dom'
import Sidebar from '../../components/datacat/Sidebar'
import DCNavbar from '../../components/datacat/DCNavbar'
import '../../stylesheets/datacat/datacat.css'

function DCSummary() {
	
  return (
    <>
      <DCNavbar />

      <div className="dc-home-parent">
        <div className="dc-home-left">
          <Sidebar />
        </div>

        <div className="dc-home-right">
          <Outlet />
        </div>
      </div>
    </>
  )
}

export default DCSummary
