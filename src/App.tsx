import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Welcome from './pages/desktop/Welcome'
import Public from './layouts/desktop/Public'
import Authenticated from './layouts/desktop/Authenticated'
import Stock from './layouts/desktop/Stock'
import ActivityLayout from './layouts/desktop/ActivityLayout'
import Login from './pages/desktop/Login'
import Home from './pages/desktop/Home'
import Signup from './pages/desktop/Signup'
import Stocks from './pages/desktop/Stocks'
import Activity from './pages/desktop/Activity'
import HowItWorks from './pages/desktop/HowItWorks'
import NotFound from './pages/desktop/NotFound'



function App() {
	
    return (
	
	<BrowserRouter>
		<Routes>	
			<Route element={<Public/>}>
	  		<Route path ='/' element={<Welcome />} />
	  		<Route path ='/how-it-works' element={<HowItWorks />} />
			</Route>
			
			<Route element={<Authenticated/>}>
			<Route path='/home' element={<Home />} />
			</Route>
			
			<Route element={<ActivityLayout/>}>
			<Route path='/activity' element={<Activity />} />
			</Route>
			
			<Route element={<Stock/>}>
			<Route path='/stocks/:symbol' element={<Stocks />} />
			</Route>
			
	  		<Route path ='/login' element={<Login />} />
	  		<Route path ='/signup' element={<Signup />} />
			
	        <Route path="*" element={<NotFound />} />
			
		</Routes>
	</BrowserRouter>
	
		)
		}	

export default App
