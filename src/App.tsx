import { BrowserRouter, Routes, Route } from 'react-router-dom';

function App() {
	
    return (
	
	<BrowserRouter>
		<Routes>	
			<Route element={<Application/>}>
	  		<Route path ='/' element={<Home />} />
			</Route>
		</Routes>
	</BrowserRouter>
	
			

export default App
