import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Welcome from './pages/Welcome'
import Public from './layouts/Public'
import ProtectedRoute from './layouts/ProtectedRoute'
import AuthForm from './pages/AuthForm'
import Home from './pages/Home'
import Stocks from './pages/Stocks'
import Activity from './pages/Activity'
import Privacy from './pages/Privacy'
import DeleteAccount from './pages/DeleteAccount'
import AllRoutes from './pages/AllRoutes'
import Endpoint from './pages/Endpoint'
import Cache from './pages/Cache'
import Latent from './pages/Latent'
import Connections from './pages/Connections'
import DCSummary from './layouts/DCSummary'
import DCList from './layouts/DCList'
import NotFound from './pages/NotFound'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Public />}>
          <Route path="/" element={<Welcome />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/delete" element={<DeleteAccount />} />
        </Route>
				
        <Route path="/login" element={<AuthForm mode='login' key='login' />} />
        <Route path="/signup" element={<AuthForm mode='signup' key='signup' />} />
				
				<Route element={<ProtectedRoute />}>
					<Route path="/home" element={<Home />} />
        	<Route path="/activity" element={<Activity />} />
        	<Route path="/stocks/:symbol" element={<Stocks />} />
				</Route>


        <Route element={<DCSummary />}>
          <Route path="/datacat" element={<AllRoutes />} />
        </Route>

        <Route element={<DCList />}>
          <Route path="/datacat/:method/*" element={<Endpoint />} />
          <Route path="/datacat/cache/:method/*" element={<Cache />} />
          <Route path="/datacat/latent/" element={<Latent />} />
          <Route path="/datacat/connections/" element={<Connections />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
