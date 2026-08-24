import { Outlet } from 'react-router-dom'
import Navbar from '../components/Navbar'
import PublicNav from '../components/PublicNav'
import { useAuth } from '../lib/auth'
import '../stylesheets/public.css'
import '../stylesheets/authenticated.css'

interface Props {
  showSearch?: boolean
}

function Public({ showSearch = true }: Props) {
  const { token } = useAuth()

  return (
    <>
      <header>{token ? <Navbar /> : <PublicNav showSearch={showSearch} />}</header>

      <Outlet />
    </>
  )
}

export default Public
