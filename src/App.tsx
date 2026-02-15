import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Welcome from './pages/desktop/Welcome'
import Public from './layouts/desktop/Public'
import Stock from './layouts/desktop/Stock'
import Login from './pages/desktop/Login'
import Home from './pages/desktop/Home'
import Signup from './pages/desktop/Signup'
import Stocks from './pages/desktop/Stocks'
import Activity from './pages/desktop/Activity'
import HowItWorks from './pages/desktop/HowItWorks'
import AllRoutes from './pages/desktop/AllRoutes'
import Endpoint from './pages/desktop/Endpoint'
import Cache from './pages/desktop/Cache'
import Latent from './pages/desktop/Latent'
import Connections from './pages/desktop/Connections'
import DCSummary from './layouts/desktop/DCSummary'
import DCList from './layouts/desktop/DCList'
import NotFound from './pages/desktop/NotFound'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Public />}>
          <Route path="/" element={<Welcome />} />
          <Route path="/how-it-works" element={<HowItWorks />} />
        </Route>

        <Route path="/home" element={<Home />} />

        <Route path="/activity" element={<Activity />} />

        <Route path="/stocks/:symbol" element={<Stocks />} />

        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

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
