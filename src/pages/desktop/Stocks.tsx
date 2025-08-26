import '../../stylesheets/desktop/stocks.css'
import Chart from '../../components/desktop/Chart'
import { useParams, useNavigate, useOutletContext } from 'react-router-dom';
import { useState, useEffect } from 'react';
import PositionTable from '../../components/desktop/PositionTable'
import BuySell from '../../components/desktop/BuySell'
import {getConsumer} from '../../consumer.js'
import { toReadable, toCurrency, toPercent }  from '../../utils.js'
import NotFoundTwo from '../../components/desktop/NotFoundTwo'

function Stocks() {
	
	const API = import.meta.env.VITE_API
	
	interface OutletContextType {
		getUserData: () => void
		userData: any
		setUserData: (data: any) => void;
	}
		
	const {getUserData, userData, setUserData} = useOutletContext<OutletContextType>();
	
	const exchangeNames = {'XNAS':'NASDAQ', 'BATS':'BATS', 'XASE':'NYSE American', 'XNYS':'NYSE', 'ARCX':'NYSE Arca'}
	
	let {symbol} = useParams();
	
	const navigate = useNavigate();
	
	const token = localStorage.getItem('authToken')
	
	const [tickerData, setTickerData] = useState(null)
	
	const [chartData, setChartData] = useState([])
		
	const [marketData, setMarketData] = useState(null)
	
	const [companyData, setCompanyData] = useState(null)
	
    const [price, setPrice] = useState(null)
	
	const [open, setOpen] = useState(null)
	
	const [asOf, setAsOf] = useState(new Date(Date.now() - 15 * 60 * 1000));
			
	const [isVerifying, setIsVerifying] = useState(true)	
	
	const [imageLoaded, setImageLoaded] = useState(false);
	
	const [tickerNotFound, setTickerNotFound] = useState(null)
	
	const percentChange = toPercent(price, open);
	
	const isPositive = percentChange && percentChange.startsWith('+');
	
	useEffect(() => {
	    if (symbol !== symbol.toUpperCase()) {
			symbol = symbol.toUpperCase()
	      navigate(`/stocks/${symbol}`, { replace: true });
	      return;
	    }
	}, [symbol])
		
	useEffect(() => {
		async function tickerCheck() {
			setCompanyData(null)
			setMarketData(null) 
			setTickerNotFound(null)
			try {
				const response = await fetch(`${API}/stocks/${symbol}/tickerdata`, {
					headers: {authToken:token}
				})
				if (response.ok) {
					const data = await response.json()
					setTickerData(data)
				} else {
					setTickerNotFound(true)
				}		
			} catch (error) {
				navigate('/home')
			} finally {
				setIsVerifying(false)
			}
		}
		tickerCheck();
	}, [symbol])
	
	
	useEffect(() => {
		async function getChartData() {
			try {
				const response = await fetch(`${API}/stocks/${symbol}/chartdata`, {
					headers: {authToken: token}
				})
				const data = await response.json()
				setChartData(data)
			} catch (error) {
				const today = new Date();
				setChartData([{date: today.toLocaleDateString(), close: 0}, {date: today.toLocaleDateString(), close: 0}]);
			}
		}
		getChartData();
	}, [symbol])
	
	useEffect(() => {
		if (!tickerData || tickerData.ticker_type === 'ETF' || tickerData.ticker_type === 'ETV') {
			return
		}
		
		async function getCompanyData() {
			try {
				const response = await fetch(`${API}/stocks/${symbol}/companydata`, {
					headers: {authToken:token}
				})
				const data = await response.json()
				setCompanyData(data)
			} catch (error) {
				setCompanyData({market_cap:'N/A', description:'N/A'})
			}
		}
		getCompanyData();	
	}, [tickerData])
	
	useEffect(() => {
		async function getMarketData() {
			try {
				const response = await fetch (`${API}/stocks/${symbol}/marketdata`, {
					headers: {authToken: token}
				})
				const data = await response.json()
				setMarketData(data)
			} catch (error) {
				setMarketData({open:'N/A', high:'N/A', low:'N/A', volume:'N/A'})
			} 
		}
		getMarketData();
	}, [symbol])
	
	useEffect(() => {
		async function getStockPrice() {
			try {
				const response = await fetch(`${API}/stocks/${symbol}/stockprice`, {
					headers: {authToken: token}
				})
				const data = await response.json();
				setPrice(data.price)
				setOpen(data.open)
			} catch (error) {
				setPrice('N/A')
				setOpen('N/A')
			}
		}
		getStockPrice();
	}, [symbol])
	
	useEffect(() => {
		const consumer = getConsumer()
		const subscription = consumer.subscriptions.create({channel:"PriceChannel", symbol:symbol}, {
			received(data) {
				console.log(data)
				setPrice(data)
			}
		})
		
		return () => subscription.unsubscribe()
	}, [symbol]);
	
	useEffect(() => {
		const timeStamp = setInterval(() => {
			setAsOf(new Date(Date.now() - 15 * 60 * 1000));
		}, 15000)
		
		return () => clearInterval(timeStamp)
	}, [])	
	
	if (isVerifying) return null;
	if (tickerNotFound) return <NotFoundTwo />
	
	return (
	<>
	<div className='stocks-left'>
	
	<div className='stock-plus-chart'>
	
	<div className='stock-heading-price'>
	
		<div className='stock-heading-container'>
	
		<div className={`image-container ${imageLoaded ? 'loaded' : ''}`}>
		  <img src={`https://img.logo.dev/ticker/${symbol}?token=pk_ZBCJebqoQXKBWVLhwcIBfg&retina=true&format=png`} 
		    height="40" width="40" onLoad={() => setImageLoaded(true)} 
			onError={(e) => {
				(e.target as HTMLImageElement).src = '/fallback-logo.svg'
				setImageLoaded(true)}}/>
			</div>
	
    		<div className="stock-text">
      		  	<p className="stock-symbol">{symbol}</p>
      			<p className={`stock-name-two ${tickerData ? 'loaded' : ''}`}>{tickerData?.name}</p>
   			</div>
	
		</div>
				
		<div className={`stock-price-container ${price ? 'loaded' : ''}`}>
			<h2 className='stock-price-header'>${toCurrency(price)}</h2>
	    	<span className='stock-price-currency'>USD</span>
			
			<div>
	    		<span className='stock-price-currency'>{asOf.toLocaleTimeString()}</span>
			</div>
			
			<div>
	    		<span className={`stock-price-currency ${isPositive ? 'positive' : 'negative'}`}>{percentChange}</span>
			</div>
		
		</div>
		
	</div>
		
		<div className='chart'>
			<Chart chartData={chartData} dataKey={'value'} />
		</div>
		
		</div>
		
		{userData.position && (
			<div className='position-two'>
			<div className="holdings">
				<h2> Holdings </h2>
			</div>
		
			<div className='positions-table'>
				<PositionTable position={userData.position} price={price} open={open}/>
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
			{tickerData?.ticker_type === 'CS' && (
				<>
				<div className='company-data-container'>
				
					<div>
						<p className='data-name'>Market cap</p>
			            <p className={`data-value ${companyData ? 'loaded' : ''}`}>{toReadable(companyData?.market_cap)}</p>
					</div>
					
				</div>
				
				<div className='stock-description'>
					<h2 className='holdings'>Description</h2>
			        <p className={`data-value ${companyData ? 'loaded' : ''}`}>{companyData?.description}</p>
				</div>
				</>
				)}
			</div>		
			
		</div>
					
		
	</div>
	
	<div className='stocks-right'>
		<BuySell getUserData={getUserData} balance={userData.balance} price={price} position={userData.position} 
		name={tickerData?.name} symbol={symbol} token={token}/>
	</div>
	</>
	)
}

export default Stocks;
