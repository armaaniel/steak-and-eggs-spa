import { Outlet, useOutletContext } from 'react-router-dom'
import Navbar from '../components/Navbar'
import PublicNav from '../components/PublicNav'
import { useAuth } from '../lib/auth'
import useTryDemo from '../hooks/useTryDemo'
import '../stylesheets/public.css'
import '../stylesheets/authenticated.css'

interface Props {
  showSearch?: boolean
}

/* One instance for the whole public surface. */
export interface DemoContext {
  tryDemo: (destination?: string) => Promise<void>
  isSubmitting: boolean
  error: string | null
}

export const useDemo = () => useOutletContext<DemoContext>()

function Public({ showSearch = true }: Props) {
  const { token } = useAuth()
  const demo = useTryDemo()

  return (
    <>
      <header>{token ? <Navbar /> : <PublicNav showSearch={showSearch} demo={demo} />}</header>

      <Outlet context={demo} />
    </>
  )
}

export default Public
