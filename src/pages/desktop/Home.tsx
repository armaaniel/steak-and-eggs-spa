import '../../stylesheets/desktop/home.css'
import Chart from '../../components/desktop/Chart'
import PositionsTable from '../../components/desktop/PositionsTable'
import AddButton from '../../components/desktop/AddButton'
import WithdrawButton from '../../components/desktop/WithdrawButton'
import { useState, useEffect } from 'react';
import {toPortfolio} from '../../utils.js'
import {getConsumer} from '../../consumer.js'
import { useThrottledCallback } from 'use-debounce';


function Home() {
		
	const [portfolio, setPortfolio] = useState(null)
	
	const [prices, setPrices] = useState({})
						
	const [chartData, setChartData] = useState([])
	
	const [error, setError] = useState(null)
			
	const token = localStorage.getItem('authToken')	
	
		async function getPortfolioData() {
			setError(null)
			try {
				const response = await fetch('http://localhost:3000/portfoliodata', {
					headers: { authToken: token }
				})
				
				if (response.ok) {
					const data = await response.json()
					setPortfolio(data)
					console.log(data)
				} else {
					const data = await response.json()
					setPortfolio(data)
					setError("Unable to fetch positions, please try again")
				}
			} catch (error) {
				setPortfolio({aum:'N/A', balance: 'N/A'})
				setError("Unable to fetch positions, please try again")
			}
		}
		
		async function getChartData() {
			try {
				const response = await fetch('http://localhost:3000/portfoliochart', {
					headers: {authToken: token}
				})
				const data = await response.json()
				setChartData(data)
			} catch (error) {
				const today = new Date()
				setChartData([{date: today.toLocaleDateString(), value: 0}, {date: today.toLocaleDateString(), value: 0}])
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
						setPrices(previous => ({...previous, [position.symbol]: data}))
						console.log(data)
					}
				}
			)
		})
		return () => subscriptions.forEach(subscription => subscription.unsubscribe())
	}, [portfolio?.positions])
	
	const updatePortfolio = useThrottledCallback(() => {
		if (!portfolio?.positions || Object.keys(prices).length === 0) return
		
		const stockValue = portfolio.positions.reduce((acc, position) => {
			const price = prices[position.symbol] || position.price
			return acc + (price * position.shares)
		}, 0)
		
		setPortfolio(prev => ({
			...prev, 
			aum: stockValue + parseFloat(prev.balance || 0)
		}))
	}, 5000, {trailing:false})
	
	useEffect(() => {
		updatePortfolio()
	}, [prices, portfolio?.positions, portfolio?.balance, updatePortfolio])
			
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
				<PositionsTable positions={portfolio?.positions} prices={prices} error={error} />
				)}
			</div>
		
		</div>
	</div>
	
	<div className='home-right'>
			
		<div className='balance-container'>
		<h2 className='balance-header'>Cash:&nbsp;</h2>
		<h2 className={`cash-balance ${portfolio ? 'loaded' : ''}`}>${toPortfolio(portfolio?.balance)}</h2>
		</div>
			
		<div className='button-container'>
			<AddButton getPortfolioData={getPortfolioData} getChartData={getChartData} />
			<WithdrawButton getPortfolioData={getPortfolioData} getChartData={getChartData} balance={portfolio?.balance} />
		</div>
	
	</div>
	
	</>
	
	)
	
}

export default Home;