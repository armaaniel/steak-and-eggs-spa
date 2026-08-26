import '../stylesheets/stocks.css'
import Chart from '../components/Chart'
import ChartRanges from '../components/ChartRanges'
import useStoredRange from '../hooks/useStoredRange'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import PositionTable from '../components/PositionTable'
import BuySell from '../components/BuySell'
import NotFoundTwo from '../components/NotFoundTwo'
import { useDemo } from '../layouts/Public'
import { toReadable, toCurrency, toPercent } from '../lib/utils.ts'
import apiFetch from '../lib/apiFetch'
import useApi from '../hooks/useApi'
import usePriceSubscriptions from '../hooks/usePriceSubscriptions'
import { useAuth } from '../lib/auth'
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

const DEFAULT_SYMBOL = 'AAPL'

const CHART_RANGES = ['1D', '1W', '1M', '3M', 'YTD', '1Y', '5Y'] as const
type ChartRange = (typeof CHART_RANGES)[number]
const DEFAULT_RANGE: ChartRange = '1D'

const RANGE_PHRASES: Record<ChartRange, string> = {
  '1D': 'Today',
  '1W': 'Past week',
  '1M': 'Past month',
  '3M': 'Past 3 months',
  'YTD': 'Year to date',
  '1Y': 'Past year',
  '5Y': 'Past 5 years'
}

function Stocks() {
  const { symbol: rawSymbol } = useParams()
  const symbol = (rawSymbol ?? DEFAULT_SYMBOL).toUpperCase()
  const navigate = useNavigate()
  const { token } = useAuth()
  const isAuthenticated = token !== null
  const demo = useDemo()
  const { tryDemo, isSubmitting: isDemoSubmitting, error: demoError } = demo

  const exchangeNames: { [key: string]: string } = { XNAS: 'NASDAQ', BATS: 'BATS', XASE: 'NYSE American', XNYS: 'NYSE', ARCX: 'NYSE Arca' }
	
  const [hoveredPoint, setHoveredPoint] = useState<ChartData | null>(null)
  const [chartRange, setChartRange] = useStoredRange('stocks.range', CHART_RANGES, DEFAULT_RANGE)
  const [tickerData, setTickerData] = useState<TickerData | null>(null)
  const [tickerNotFound, setTickerNotFound] = useState(false)

  const { data: quote } = useApi<Quote>(
    `/stocks/${symbol}/stockprice`,
    { price: 'N/A', open: 'N/A' }
  )
  const prices = usePriceSubscriptions([symbol])
  const price = prices[symbol] ?? quote?.price ?? null

  useEffect(() => {
    if (rawSymbol && rawSymbol !== symbol) {
      navigate(`/stocks/${symbol}`, { replace: true })
    }
  }, [rawSymbol, symbol, navigate])
	
	const { data: userData, getData: getUserData } = useApi<UserData>(isAuthenticated ? `/stocks/${symbol}/userdata` : null,
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
	
	const { data: chartData } = useApi<ChartData[]>(`/stocks/${symbol}/chartdata?range=${chartRange}`, [
	{ date: new Date().toLocaleDateString(), value: 0 },
	{ date: new Date().toLocaleDateString(), value: 0 }
	])

	const selectRange = (range: ChartRange) => {
		setChartRange(range)
		setHoveredPoint(null)
	}

	const baseline = chartData?.[0]?.value ?? null
	const decimals = baseline !== null && Math.abs(baseline) < 1 ? 4 : 2
	const current = hoveredPoint?.value ?? price

	const percentChange = toPercent(current, baseline, decimals)
	const isPositive = Boolean(percentChange && percentChange.startsWith('+'))

	const change = baseline !== null && current !== null ? Number(current) - baseline : null
	const changeLabel = change === null || isNaN(change) || percentChange === null
		? null
		: `${change >= 0 ? '+' : '-'}$${toCurrency(Math.abs(change), decimals)} (${percentChange})`
	
	const { data: companyData } = useApi<CompanyData>(`/stocks/${symbol}/companydata`,
	{ market_cap: 'N/A', description: 'N/A'})
	
	const { data: marketData } = useApi<MarketData>(`/stocks/${symbol}/marketdata`, 
	{ open: 'N/A', high: 'N/A', low: 'N/A', volume: 'N/A' })
	
	/* one-way: nothing sets it false, so a load starting after the first reveal can't hide a page that's already up */
	const [isReady, setIsReady] = useState(false)

	useEffect(() => {
		const ready = isAuthenticated ? tickerData && userData : tickerData
		if (ready) setIsReady(true)
	}, [isAuthenticated, tickerData, userData])

  if (tickerNotFound) {
    return (
			<main className="home loaded">
				<NotFoundTwo />
      </main>
    )
  }

  return (
    <>
      <main className={`home ${isReady ? 'loaded' : ''}`}>
        <div className='stocks-left'>
          <div className="stock-plus-chart">
            <div className="stock-heading-price">
              <div className="stock-heading-container">
                <TickerLogo symbol={symbol} size={40} />
                <div className="stock-text">
                  <p className="stock-symbol">{symbol}</p>
                  <p className={`stock-name-two ${tickerData ? 'loaded' : ''}`}>{tickerData?.name}</p>
                </div>
              </div>

              <div className={`stock-price-container ${price ? 'loaded' : ''}`}>
                <h2 className="stock-price-header">${toCurrency(hoveredPoint?.value ?? price, decimals)}</h2>
                <div><span className={`stock-price-currency ${isPositive ? 'positive' : 'negative'}`}>{changeLabel}</span></div>
                {changeLabel && <span className="stock-price-phrase">{RANGE_PHRASES[chartRange]}</span>}
              </div>
            </div>

            <div className="chart">
              {chartData && <Chart chartData={chartData} onHover={setHoveredPoint} />}
            </div>

            <ChartRanges ranges={CHART_RANGES} selected={chartRange} onSelect={selectRange} />
          </div>

          {!isAuthenticated && (
            <div className="stock-pitch">
              <h3 className="stock-pitch-heading">Practice trading {symbol} on Steak &amp; Eggs</h3>

              <p className="stock-pitch-body">
                Steak &amp; Eggs gives you a platform to learn the market without risking a dollar.
                Streaming prices, performance tracking, and live profit and loss, all for free.
              </p>

              <div className="stock-pitch-actions">
                <Link to="/login" className="btn btn-ghost">
                  Log In
                </Link>

                <Link to="/signup" className="btn btn-primary">
                  Sign Up
                </Link>

                <button className="btn btn-ghost" onClick={() => tryDemo(`/stocks/${symbol}`)} disabled={isDemoSubmitting}>
                  Try Demo
                </button>

                <div className={`stock-pitch-error ${demoError ? 'visible' : ''}`}>
                  <p>{demoError ?? '\u00A0'}</p>
                </div>
              </div>
            </div>
          )}

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
          <BuySell demo={demo} isAuthenticated={isAuthenticated} getUserData={getUserData} balance={userData?.balance} price={price} position={userData?.position} symbol={symbol} />
        </div>
      </main>
    </>
  )
}

export default Stocks