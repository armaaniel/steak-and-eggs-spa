import '../../stylesheets/desktop/stocks.css'
import Chart from '../../components/desktop/Chart'
import { useParams, useNavigate, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import PositionTable from '../../components/desktop/PositionTable'
import BuySell from '../../components/desktop/BuySell'
import Navbar from '../../components/desktop/Navbar'
import NotFoundTwo from '../../components/desktop/NotFoundTwo'
import { getConsumer, resetConsumer } from '../../consumer.ts'
import { toReadable, toCurrency, toPercent } from '../../utils.ts'
import { toReadable, toCurrency, toPercent } from '../../hooks/useApi'
import type { TickerData, UserData, ChartData, Price, Open } from '../../types.ts'

interface MarketData {
  high: number | string
  open: number | string
  low: number | string
  volume: number | string
}

interface CompanyData {
  description: string | null
  market_cap: number | string | null
}

function Stocks() {
  let { symbol } = useParams()
  const navigate = useNavigate()

  const API: string = import.meta.env.VITE_API
  const exchangeNames: { [key: string]: string } = { XNAS: 'NASDAQ', BATS: 'BATS', XASE: 'NYSE American', XNYS: 'NYSE', ARCX: 'NYSE Arca' }
	
	const [token, setToken] = useState(localStorage.getItem('authToken'))
  const [tickerData, setTickerData] = useState<TickerData | null>(null)
  const [tickerNotFound, setTickerNotFound] = useState(false)
  const [userData, setUserData] = useState<UserData | null>(null)
  const [price, setPrice] = useState<Price>(null)
  const [open, setOpen] = useState<Open>(null)
  const [asOf, setAsOf] = useState(new Date(Date.now() - 15 * 60 * 1000))
  const [imageLoaded, setImageLoaded] = useState(false)

  const percentChange = toPercent(price, open)
  const isPositive = Boolean(percentChange && percentChange.startsWith('+'))

  async function getUserData() {
    if (!token) return
    try {
      const response = await fetch(`${API}/stocks/${symbol}/userdata`, {
        headers: { authToken: token } as HeadersInit,
      })
      if (response.status === 401) {
        localStorage.removeItem('authToken')
        resetConsumer()
				setToken(null)
        return
      }
      const data = await response.json()
      setUserData(data)
    } catch (error) {
      setUserData({ balance: 'N/A' })
    }
  }

  useEffect(() => {
    if (symbol && symbol !== symbol.toUpperCase()) {
      symbol = symbol.toUpperCase()
      navigate(`/stocks/${symbol}`, { replace: true })
      return
    }
  }, [symbol])

  useEffect(() => {
    async function getData() {
      if (!token) return
      setTickerNotFound(false)
      try {
        const [tickerResponse] = await Promise.all([
          fetch(`${API}/stocks/${symbol}/tickerdata`, {
            headers: { authToken: token } as HeadersInit,
          }),
          getUserData(),
        ])
        if (tickerResponse.ok) {
          const data = await tickerResponse.json()
          setTickerData(data)
        } else if (tickerResponse.status === 401) {
          localStorage.removeItem('authToken')
          resetConsumer()
					setToken(null)
        } else {
          setTickerNotFound(true)
        }
      } catch (error) {
        setTickerData({exchange: 'N/A', name: 'N/A', ticker_type: 'N/A'})
      }
    }
    getData()
  }, [symbol])
	
	const { data: chartData } = useAPI<ChartData[]>(`/stocks/${symbol}/chartdata`, [
	{ date: new Date().toLocaleDateString(), value: 0 },
	{ date: new Date().toLocaleDateString(), value: 0 }
	])
	
	const { data: companyData } = useApi<CompanyData>(`/stocks/${symbol}/companydata`,
	{ market_cap: 'N/A', description: 'N/A'}
	)
	
	const { data: marketData } = useApi<MarketData>(`/stocks/${symbol}/marketdata`, 
	{ open: 'N/A', high: 'N/A', low: 'N/A', volume: 'N/A' }
	)


  useEffect(() => {
    async function getStockPrice() {
      try {
        const response = await fetch(`${API}/stocks/${symbol}/stockprice`, {
          headers: { authToken: token } as HeadersInit,
        })
	      if (response.status === 401) {
	        localStorage.removeItem('authToken')
	        resetConsumer()
					setToken(null)
	        return
	      }
        const data = await response.json()
        setPrice(data.price)
        setOpen(data.open)
      } catch (error) {
        setPrice('N/A')
        setOpen('N/A')
      }
    }
    getStockPrice()
  }, [symbol])

  useEffect(() => {
    const consumer = getConsumer()
    const subscription = consumer.subscriptions.create(
      { channel: 'PriceChannel', symbol: symbol },
      {
        received(data: number) {
          setPrice(data)
        },
      },
    )
    return () => subscription.unsubscribe()
  }, [symbol])

  useEffect(() => {
    const timeStamp = setInterval(() => {
      setAsOf(new Date(Date.now() - 15 * 60 * 1000))
    }, 15000)
    return () => clearInterval(timeStamp)
  }, [])

  if (!token) {
    return <Navigate to="/login" />
  }

  if (tickerNotFound) {
    return (
      <>
        <header><Navbar /></header>
        <main className="home loaded">
          <NotFoundTwo />
        </main>
      </>
    )
  }

  return (
    <>
      <header><Navbar /></header>
      <main className={`home ${tickerData ? 'loaded' : ''}`}>
        <div className='stocks-left'>
          <div className="stock-plus-chart">
            <div className="stock-heading-price">
              <div className="stock-heading-container">
                <div className={`image-container ${imageLoaded ? 'loaded' : ''}`}>
                  <img
                    src={`https://img.logo.dev/ticker/${symbol}?token=pk_ZBCJebqoQXKBWVLhwcIBfg&retina=true&format=png`}
                    height="40" width="40"
                    onLoad={() => setImageLoaded(true)}
                    onError={(e) => {
                      ;(e.target as HTMLImageElement).src = '/fallback-logo.svg'
                      setImageLoaded(true)
                    }}
                  />
                </div>
                <div className="stock-text">
                  <p className="stock-symbol">{symbol}</p>
                  <p className={`stock-name-two ${tickerData ? 'loaded' : ''}`}>{tickerData?.name}</p>
                </div>
              </div>

              <div className={`stock-price-container ${price ? 'loaded' : ''}`}>
                <h2 className="stock-price-header">${toCurrency(price)}</h2>
                <span className="stock-price-currency">USD</span>
                <div><span className="stock-price-currency">{asOf.toLocaleTimeString()}</span></div>
                <div><span className={`stock-price-currency ${isPositive ? 'positive' : 'negative'}`}>{percentChange}</span></div>
              </div>
            </div>

            <div className="chart">
              <Chart chartData={chartData} />
            </div>
          </div>

          {userData?.position && (
            <div className="position-two">
              <div className="holdings"><h2>Holdings</h2></div>
              <div className="positions-table">
                <PositionTable position={userData.position} price={price} />
              </div>
            </div>
          )}

          <div className="holdings"><h2>Market Details</h2></div>

          <div className="market-data">
            <div className="market-data-container">
              <div>
                <p className="data-name">Open</p>
                <p className={`data-value ${marketData ? 'loaded' : ''}`}>{toCurrency(marketData?.open)}</p>
              </div>
              <div>
                <p className="data-name">High</p>
                <p className={`data-value ${marketData ? 'loaded' : ''}`}>{toCurrency(marketData?.high)}</p>
              </div>
              <div>
                <p className="data-name">Low</p>
                <p className={`data-value ${marketData ? 'loaded' : ''}`}>{toCurrency(marketData?.low)}</p>
              </div>
            </div>

            <div className="market-data-container">
              <div>
                <p className="data-name">Volume</p>
                <p className={`data-value ${marketData ? 'loaded' : ''}`}>{toReadable(marketData?.volume)}</p>
              </div>
              <div>
                <p className="data-name">Currency</p>
                <p className={`data-value ${marketData ? 'loaded' : ''}`}>USD</p>
              </div>
              <div>
                <p className="data-name">Exchange</p>
                <p className={`data-value ${marketData ? 'loaded' : ''}`}>{exchangeNames[tickerData?.exchange ?? '']}</p>
              </div>
            </div>

            <div className="company-data">
              {tickerData?.ticker_type === 'CS' && (
                <>
                  <div className="company-data-container">
                    <div>
                      <p className="data-name">Market cap</p>
                      <p className={`data-value ${companyData ? 'loaded' : ''}`}>{toReadable(companyData?.market_cap)}</p>
                    </div>
                  </div>
                  <div className="stock-description">
                    <h2 className="holdings">Description</h2>
                    <p className={`data-value ${companyData ? 'loaded' : ''}`}>{companyData?.description}</p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <div className='stocks-right'>
          <BuySell getUserData={getUserData} balance={userData?.balance} price={price} position={userData?.position} name={tickerData?.name} symbol={symbol} token={token} />
        </div>
      </main>
    </>
  )
}

export default Stocks