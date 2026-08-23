import { Outlet } from 'react-router-dom'
import PublicNav from '../components/PublicNav'
import '../stylesheets/public.css'

function Public() {
  return (
    <>
      <header><PublicNav /></header>

      <Outlet />
    </>
  )
}

export default Public
