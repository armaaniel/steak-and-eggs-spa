import '../../stylesheets/desktop/stocks.css'
import Chart from '../../components/desktop/Chart'
import { useParams, useNavigate, useOutletContext } from 'react-router-dom';
import { useState, useEffect } from 'react';
import PositionTable from '../../components/desktop/PositionTable'
import BuySell from '../../components/desktop/BuySell'
import consumer from '../../consumer.js'
import { toReadable, toCurrency }  from '../../utils.js'

function Stocks() {
		
	const {getUserData, position, setPosition, balance, setBalance} = useOutletContext();
	
	const exchangeNames = {'XNAS':'NASDAQ', 'BATS':'BATS', 'XASE':'NYSE American', 'XNYS':'NYSE', 'ARCX':'NYSE Arca'}
	
	const {symbol} = useParams();
	
	const navigate = useNavigate();
	
	const token = localStorage.getItem('authToken')
	
	const [tickerData, setTickerData] = useState(null)
	
	const [chartData, setChartData] = useState([])
		
	const [marketData, setMarketData] = useState(null)
	
	const [companyData, setCompanyData] = useState(null)
	
    const [price, setPrice] = useState(null)
			
	const [isVerifying, setIsVerifying] = useState(true)
	
	const [isVerified, setIsVerified] = useState(false)
	
		
	useEffect(() => {
		async function tickerCheck() {
			setCompanyData(null)
			setMarketData(null) 
			try {
				const response = await fetch(`http://localhost:3000/stocks/${symbol}/tickerdata`, {
					headers: {authToken:token}
				})
				
				if (response.ok) {
					const data = await response.json()
					setTickerData(data)
					setIsVerified(true)
					console.log(data)
				} else {
					navigate('/home')
				}
					
			} catch (error) {
				console.log(error)
				navigate('/home')
			} finally {
				setIsVerifying(false)
			}
		}
		
		tickerCheck()
	}, [symbol])
	
	
	useEffect(() => {
		async function getChartData() {
			try {
				const response = await fetch(`http://localhost:3000/stocks/${symbol}/chartdata`, {
					headers: {authToken: token}
				})
				const data = await response.json()
				setChartData(data)
			} catch (error) {
				console.error(error)
			}
		}
		getChartData();
	}, [symbol])
	
	useEffect(() => {
		if (!tickerData || tickerData.ticker_type === 'ETF') {
			return
		}
		
		async function getCompanyData() {
			try {
				const response = await fetch(`http://localhost:3000/stocks/${symbol}/companydata`, {
					headers: {authToken:token}
				})
				const data = await response.json()
				setCompanyData(data)
				console.log(data)
			} catch (error) {
				console.error(error)
			}
		}
		getCompanyData();	
	}, [tickerData])
	
	useEffect(() => {
		async function getMarketData() {
			try {
				const response = await fetch (`http://localhost:3000/stocks/${symbol}/marketdata`, {
					headers: {authToken: token}
				})
				const data = await response.json()
				setMarketData(data)
				console.log(data)
			} catch (error) {
				console.error(error)
			} 
		}
		getMarketData();
	}, [symbol])
	
	useEffect(() => {
		async function getStockPrice() {
			try {
				const response = await fetch(`http://localhost:3000/stocks/${symbol}/stockprice`, {
					headers: {authToken: token}
				})
				const data = await response.json();
				setPrice(data)
				console.log(data)
			} catch (error) {
				console.log(error)
			}
		}
		getStockPrice();
	}, [symbol])
	
	useEffect(() => {
		const subscription = consumer.subscriptions.create({channel:"PriceChannel", symbol:symbol}, {
			received(data) {
				console.log(data)
				setPrice(data)
			}
		})
		
		return () => subscription.unsubscribe()
	}, [symbol]);
	
   
	
	
	if (isVerifying) return null;
	if (!isVerified) return <Navigate to='/home'/>;
	
	return (
	<>
	<div className='stocks-left'>
	
	<div className='stock-plus-chart'>
	
	<div className='stock-heading-price'>
	
		<div className='stock-heading-container'>
	
    		<img src={`https://img.logo.dev/ticker/${symbol}?token=pk_ZBCJebqoQXKBWVLhwcIBfg&retina=true&format=png`} 
			height="40" width="40" onError={(e) => {e.target.src = '/fallback-logo.svg'}}/>
	
    		<div className="stock-text">
      		  	<p className="stock-symbol">{symbol}</p>
      			<p className={`stock-name-two ${tickerData ? 'loaded' : ''}`}>{tickerData?.name}</p>
   			</div>
	
		</div>
		
		<div className='stock-price-container'>
	    <h2 className='stock-price-header'>${toCurrency(price)}</h2>
	    <span className='stock-price-currency'>USD</span>
		</div>
		
		</div>
		
		
	
		<div className='chart'>
			<Chart chartData={chartData} dataKey={'close'} />
		</div>
		
		</div>
		
		{position && (
			<div className='position-two'>
			<div className="holdings">
				<h2> Holdings </h2>
			</div>
		
			<div className='positions-table'>
				<PositionTable position={position} price={price}/>
			</div>
			</div>
		)}
		
		<div className="holdings">
			<h2> Market Details </h2>
		</div>
		
		<div className='market-data'>
		
			<div className='market-data-container'>
		
				<div>
					<p className='data-name'>Open</p>
					<p className={`data-value ${marketData ? 'loaded' : ''}`}> {toCurrency(marketData?.open)}</p>
				</div>
		
				<div>
					<p className='data-name'>High</p>
					<p className={`data-value ${marketData ? 'loaded' : ''}`}> {toCurrency(marketData?.high)}</p>
				</div>
		
				<div>
					<p className='data-name'>Low</p>
					<p className={`data-value ${marketData ? 'loaded' : ''}`}> {toCurrency(marketData?.low)}</p>
				</div>
				
			</div>
			
			<div className='market-data-container'>
			
				<div>
					<p className='data-name'>Volume</p>
					<p className={`data-value ${marketData ? 'loaded' : ''}`}> {toReadable(marketData?.volume)}</p>
				</div>
				
				<div>
					<p className='data-name'>Currency</p>
					<p className={`data-value ${marketData ? 'loaded' : ''}`}> USD </p>
				</div>
				
				<div>
					<p className='data-name'>Exchange</p>
					<p className={`data-value ${marketData ? 'loaded' : ''}`}> {exchangeNames[tickerData?.exchange]}</p>
				</div>
			
			</div>	
			
			<div className='company-data'>
			{companyData && (
				<>
				<div className='company-data-container'>
					<div>
						<p className='data-name'>52 week high</p>
			            <p className="data-value loaded">{toCurrency(companyData['52_week_high'])}</p>
					</div>
				
					<div>
						<p className='data-name'>52 week low</p>
			            <p className="data-value loaded">{toCurrency(companyData['52_week_low'])}</p>
					</div>
			
					<div>
						<p className='data-name'>Market cap</p>
			            <p className="data-value loaded">{toReadable(companyData.market_capitalization)}</p>
					</div>
				</div>
				
				{companyData.description !== 'None' && (
				<div className='stock-description'>
					<h2 className='holdings'>Description</h2>
			        <p className="data-value loaded">{companyData.description}</p>
				</div>
				)}
				</>
			
				)}
			</div>		
			
		</div>
					
		
	</div>
	
	<div className='stocks-right'>
		<BuySell getUserData={getUserData} balance={balance} price={price} position={position} 
		name={tickerData?.name} symbol={symbol} token={token}/>
	</div>
	</>
	)
}

export default Stocks;
