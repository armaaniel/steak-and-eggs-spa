import '../../stylesheets/desktop/home.css'
import Chart from '../../components/desktop/Chart'
import PositionsTable from '../../components/desktop/PositionsTable'
import AddButton from '../../components/desktop/AddButton'
import WithdrawButton from '../../components/desktop/WithdrawButton'
import { useState, useEffect } from 'react';

function Home() {
	
	const [portfolioValue, setPortfolioValue] = useState(null)
	
	const [balance, setBalance] = useState(null)
	
	const [positions, setPositions] = useState(null)
	
	const [chartData, setChartData] = useState([])
		
	const token = localStorage.getItem('authToken')		

		async function getPortfolioData() {
			try {
				const response = await fetch('http://localhost:3000/portfoliodata', {
					headers: { authToken: token }
				})
				const data = await response.json()
				
				setPortfolioValue(parseFloat(data.aum).toFixed(2))
				setPositions(data.positions)
				setBalance(parseFloat(data.balance).toFixed(2))
				
			} catch (error) {
				console.error(error)
			}
		}
		
		async function getChartData() {
			try {
				const response = await fetch('http://localhost:3000/portfoliochart', {
					headers: {authToken: token}
				})
				const data = await response.json()
				setChartData(data)
				console.log(data)
			} catch (error) {
				console.error(error)
			}
		}
		
		useEffect(() => {
			getPortfolioData()
   			getChartData()
		}, []) 		
	
	return (
	
	<>
	
	<div className='home-left'>
		<div className='port-value'>
			<h2 className='port-value-heading'>Your Portfolio Value Is:&nbsp;</h2>
			<h2 className='portfolio-value'>${portfolioValue}</h2>
		</div>
		
		<div className='chart'>
			<Chart chartData={chartData} dataKey='value' />
		</div>
		
		<div className='position'>
		
			<div className='holdings-div'>
				<h2 className='holdings'> Holdings </h2>
			</div>
		
			<div className='positions-table'>
				<PositionsTable positions={positions} />
			</div>
		
		</div>
	</div>
	
	<div className='home-right'>
			
		<div className='balance-container'>
		<h2 className='balance-header'>Cash Balance:&nbsp;</h2>
		<h2 className={`cash-balance ${portfolioValue ? 'loaded' : ''}`}>${balance}</h2>
		</div>
		
		<div className='button-container'>
			<AddButton getPortfolioData={getPortfolioData} getChartData={getChartData} />
			<WithdrawButton getPortfolioData={getPortfolioData} getChartData={getChartData} />
		</div>
	
	</div>
	
	</>
	
	)
	
}

export default Home;