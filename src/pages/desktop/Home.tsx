import '../../stylesheets/desktop/home.css'
import Chart from '../../components/desktop/Chart'
import PositionsTable from '../../components/desktop/PositionsTable'
import AddButton from '../../components/desktop/AddButton'
import WithdrawButton from '../../components/desktop/WithdrawButton'
import { useState, useEffect } from 'react';
import {toPortfolio} from '../../utils.js'
import {getConsumer} from '../../consumer.js'

function Home() {
		
	const [portfolio, setPortfolio] = useState(null)
	
	const [prices, setPrices] = useState({})
					
	const [chartData, setChartData] = useState([])
		
	const token = localStorage.getItem('authToken')		

		async function getPortfolioData() {
			try {
				const response = await fetch('http://localhost:3000/portfoliodata', {
					headers: { authToken: token }
				})
				const data = await response.json()
				setPortfolio(data)
				console.log(data)
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
		
		useEffect(() => {
			if (!portfolio?.positions) return
			
			const consumer = getConsumer()
			const subscriptions = portfolio.positions.map(position => {
				return consumer.subscriptions.create({channel: "PriceChannel", symbol: position.symbol}, 
				{
					received(data) {
						setPrices(previous => ({...previous, [position.symbol]: data.price}))
					}
				}
			)
		})
		return () => subscriptions.forEach(subscription => subscription.unsubscribe())
	}, [portfolio?.positions])
	
	useEffect(() => {
		if (!portfolio?.positions || Object.keys(prices).length === 0) return
		
		const stockValue = portfolio.positions.reduce((acc, position) => {
			const price = prices[position.symbol] || position.price
			return acc + (price * position.shares)
		}, 0)
		
		setPortfolio(prev => ({...prev, aum: stockValue + prev.balance}))
	}, [prices, portfolio?.positions, portfolio?.balance])
			
			
		
	return (
	
	<>
	
	<div className='home-left'>
		<div className='port-value'>
			<h2 className='port-value-heading'>Your Portfolio Value Is:&nbsp;</h2>
			<h2 className='portfolio-value'>${toPortfolio(portfolio?.aum)}</h2>
		</div>
		
		<div className='chart'>
			<Chart chartData={chartData} dataKey='value' />
		</div>
		
		<div className='position'>
		
			<div className='holdings-div'>
				<h2 className='holdings'> Holdings </h2>
			</div>
		
			<div className='positions-table'>
			{portfolio && (
				<PositionsTable positions={portfolio?.positions} prices={prices} />
				)}
			</div>
		
		</div>
	</div>
	
	<div className='home-right'>
			
		<div className='balance-container'>
		<h2 className='balance-header'>Cash Balance:&nbsp;</h2>
		<h2 className={`cash-balance ${portfolio ? 'loaded' : ''}`}>${toPortfolio(portfolio?.balance)}</h2>
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