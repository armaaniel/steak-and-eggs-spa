import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './lib/auth'
import Public from './layouts/Public'
import ProtectedRoute from './layouts/ProtectedRoute'
import AuthForm from './pages/AuthForm'
import About from './pages/About'
import Home from './pages/Home'
import Stocks from './pages/Stocks'
import Activity from './pages/Activity'
import Privacy from './pages/Privacy'
import DeleteAccount from './pages/DeleteAccount'
import AllRoutes from './pages/datacat/AllRoutes'
import Endpoint from './pages/datacat/Endpoint'
import Cache from './pages/datacat/Cache'
import Latent from './pages/datacat/Latent'
import Connections from './pages/datacat/Connections'
import Uptime from './pages/datacat/Uptime'
import Ingester from './pages/datacat/Ingester'
import DCSummary from './layouts/datacat/DCSummary'
import DCList from './layouts/datacat/DCList'
import NotFound from './pages/NotFound'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route element={<Public />}>
            <Route path="/" element={<Stocks />} />
            <Route path="/stocks/:symbol" element={<Stocks />} />
            <Route path="/about" element={<About />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/delete" element={<DeleteAccount />} />
          </Route>

          <Route element={<Public showSearch={false} />}>
            <Route path="/login" element={<AuthForm mode='login' key='login' />} />
            <Route path="/signup" element={<AuthForm mode='signup' key='signup' />} />
          </Route>

  				<Route element={<ProtectedRoute />}>
  					<Route path="/home" element={<Home />} />
          	<Route path="/activity" element={<Activity />} />
  				</Route>


          <Route element={<DCSummary />}>
            <Route path="/datacat" element={<AllRoutes />} />
          </Route>

          <Route element={<DCList />}>
            <Route path="/datacat/:method/*" element={<Endpoint />} />
            <Route path="/datacat/cache/:method/*" element={<Cache />} />
            <Route path="/datacat/latent/" element={<Latent />} />
            <Route path="/datacat/connections/" element={<Connections />} />
            <Route path="/datacat/uptime/" element={<Uptime />} />
            <Route path="/datacat/ingester/" element={<Ingester />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
