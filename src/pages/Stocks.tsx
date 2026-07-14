import '../stylesheets/stocks.css'
import Chart from '../components/Chart'
import { useParams, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import PositionTable from '../components/PositionTable'
import BuySell from '../components/BuySell'
import NotFoundTwo from '../components/NotFoundTwo'
import { toReadable, toCurrency, toPercent } from '../lib/utils.ts'
import apiFetch from '../lib/apiFetch'
import useApi from '../hooks/useApi'
import usePriceSubscriptions from '../hooks/usePriceSubscriptions'
import TickerLogo from '../components/TickerLogo'
import type { TickerData, UserData, ChartData, Price, Open } from '../lib/types.ts'

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

interface Quote {
  price: Price
  open: Open
}

function Stocks() {
  const { symbol: rawSymbol } = useParams()
  const symbol = rawSymbol?.toUpperCase()
  const navigate = useNavigate()

  const exchangeNames: { [key: string]: string } = { XNAS: 'NASDAQ', BATS: 'BATS', XASE: 'NYSE American', XNYS: 'NYSE', ARCX: 'NYSE Arca' }
	
  const [tickerData, setTickerData] = useState<TickerData | null>(null)
  const [tickerNotFound, setTickerNotFound] = useState(false)
  const [asOf, setAsOf] = useState(new Date(Date.now() - 15 * 60 * 1000))
  const [imageLoaded, setImageLoaded] = useState(false)

  const { data: quote } = useApi<Quote>(
    `/stocks/${symbol}/stockprice`,
    { price: 'N/A', open: 'N/A' }
  )
  const prices = usePriceSubscriptions(symbol ? [symbol] : [])
  const price = prices[symbol ?? ''] ?? quote?.price ?? null
  const open = quote?.open ?? null

  const percentChange = toPercent(price, open)
  const isPositive = Boolean(percentChange && percentChange.startsWith('+'))

  useEffect(() => {
    if (rawSymbol && rawSymbol !== symbol) {
      navigate(`/stocks/${symbol}`, { replace: true })
    }
  }, [rawSymbol, symbol, navigate])
	
	const { data: userData, getData: getUserData } = useApi<UserData>(`/stocks/${symbol}/userdata`,
	{balance:'N/A'})
	
	useEffect(() => {
		async function getTickerData() {
			setTickerNotFound(false)
			try {
				const response = await apiFetch(`/stocks/${symbol}/tickerdata`)
				if (!response) return
				if (response.ok) {
					const data = await response.json()
					setTickerData(data)
				} else {
					setTickerNotFound(true)
				}
			} catch {
        setTickerData({exchange: 'N/A', name: 'N/A', ticker_type: 'N/A'})
			}
		}
		getTickerData()
	}, [symbol])
	
	const { data: chartData } = useApi<ChartData[]>(`/stocks/${symbol}/chartdata`, [
	{ date: new Date().toLocaleDateString(), value: 0 },
	{ date: new Date().toLocaleDateString(), value: 0 }
	])
	
	const { data: companyData } = useApi<CompanyData>(`/stocks/${symbol}/companydata`,
	{ market_cap: 'N/A', description: 'N/A'})
	
	const { data: marketData } = useApi<MarketData>(`/stocks/${symbol}/marketdata`, 
	{ open: 'N/A', high: 'N/A', low: 'N/A', volume: 'N/A' })

  useEffect(() => {
    const timeStamp = setInterval(() => {
      setAsOf(new Date(Date.now() - 15 * 60 * 1000))
    }, 15000)
    return () => clearInterval(timeStamp)
  }, [])

  if (tickerNotFound) {
    return (
			<main className="home loaded">
				<NotFoundTwo />
      </main>
    )
  }

  return (
    <>
      <main className={`home ${tickerData && userData ? 'loaded' : ''}`}>
        <div className='stocks-left'>
          <div className="stock-plus-chart">
            <div className="stock-heading-price">
              <div className="stock-heading-container">
                <div className={`image-container ${imageLoaded ? 'loaded' : ''}`}>
                  <TickerLogo
                    symbol={symbol!}
                    size={40}
                    onLoad={() => setImageLoaded(true)}
                    onError={() => setImageLoaded(true)}
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
              {chartData && <Chart chartData={chartData} />}
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
          <BuySell getUserData={getUserData} balance={userData?.balance} price={price} position={userData?.position} symbol={symbol} />
        </div>
      </main>
    </>
  )
}

export default Stocks