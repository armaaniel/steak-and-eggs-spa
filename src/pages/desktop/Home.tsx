import '../../stylesheets/desktop/home.css'
import '../../stylesheets/desktop/authenticated.css'
import Chart from '../../components/desktop/Chart'
import PositionsTable from '../../components/desktop/PositionsTable'
import FundsButton from '../../components/desktop/FundsButton'
import { useState, useEffect } from 'react'
import { toPortfolio } from '../../utils.ts'
import { getConsumer, resetConsumer } from '../../consumer.ts'
import { useThrottledCallback } from 'use-debounce'
import Navbar from '../../components/desktop/Navbar'
import { Navigate } from 'react-router-dom'
import type { Positions, Prices, Error } from '../../types.ts'

interface Portfolio {
  aum: string | number
  balance: string
  positions?: Positions[]
}

interface ChartData {
  date: string
  value: number
}

function Home() {
  const API: string = import.meta.env.VITE_API

	const [token, setToken] = useState(localStorage.getItem('authToken'))
  const [portfolio, setPortfolio] = useState<Portfolio | undefined>(undefined)
  const [prices, setPrices] = useState<Prices>({})
  const [chartData, setChartData] = useState<ChartData[]>([])
  const [error, setError] = useState<Error>(null)

  async function getPortfolioData() {
    setError(null)
    if (!token) return
    try {
      const response = await fetch(`${API}/portfoliodata`, {
        headers: { authToken: token },
      })

      if (response.ok) {
        const data = await response.json()
        setPortfolio(data)
      } else if (response.status === 401) {
        localStorage.removeItem('authToken')
        resetConsumer()
				setToken(null)
      } else {
        const data = await response.json()
        setPortfolio(data)
        setError('Unable to fetch positions, please try again')
      }
    } catch (error) {
      setPortfolio({ aum: 'N/A', balance: 'N/A' })
      setError('Unable to fetch positions, please try again')
    }
  }

  async function getChartData() {
    if (!token) return
    try {
      const response = await fetch(`${API}/portfoliochart`, {
        headers: { authToken: token },
      })
      if (response.status === 401) {
        localStorage.removeItem('authToken')
        resetConsumer()
				setToken(null)
				return
      }
      const data = await response.json()
      setChartData(data)
    } catch (error) {
      const today = new Date()
      setChartData([
        { date: today.toLocaleDateString(), value: 0 },
        { date: today.toLocaleDateString(), value: 0 },
      ])
    }
  }

  useEffect(() => {
    getPortfolioData()
    getChartData()
  }, [])

  useEffect(() => {
    if (!portfolio?.positions) return

    const consumer = getConsumer()
    const subscriptions = portfolio.positions.map((position) => {
      return consumer.subscriptions.create(
        { channel: 'PriceChannel', symbol: position.symbol },
        {
          received(data: number) {
            setPrices((prev) => ({ ...prev, [position.symbol]: data }))
          },
        },
      )
    })
    return () => subscriptions.forEach((subscription) => subscription.unsubscribe())
  }, [portfolio?.positions])

  const updatePortfolio = useThrottledCallback(
    () => {
      if (!portfolio?.positions || Object.keys(prices).length === 0) return

      const stockValue = portfolio.positions.reduce((acc, position) => {
        const price = prices[position.symbol] || position.price
        return acc + price * position.shares
      }, 0)

      setPortfolio((prev) => ({ ...prev!, aum: stockValue + parseFloat(prev?.balance || '0') }))
    },
    5000,
    { trailing: false },
  )

  useEffect(() => {
    updatePortfolio()
  }, [prices, portfolio?.positions, portfolio?.balance, updatePortfolio])

  if (!token) {
    return <Navigate to="/login" />
  }

  return (
    <>
      <header>
        <Navbar />
      </header>

      <main className={`home ${portfolio ? 'loaded' : ''}`}>
        <div className="home-left">
          <div className="port-value">
            <h2 className="portfolio-value">Your Portfolio Value Is:&nbsp;</h2>
            <h2 className='portfolio-value'>{toPortfolio(portfolio?.aum)}</h2>
          </div>

          <div className="chart">
            <Chart chartData={chartData} />
          </div>

          <div className="position">
            <div>
              <h2 className="portfolio-value"> Holdings </h2>
            </div>

            <div className='positions-table'>
							<PositionsTable positions={portfolio?.positions} prices={prices} error={error}/>
						</div>
					</div>
			 	</div>

        <div className="home-right">
          <div className="balance-container">
            <h2 className="portfolio-value">Cash:&nbsp;</h2>
            <h2 className='portfolio-value'>{toPortfolio(portfolio?.balance)}</h2>
          </div>

          <div className="button-container">
            <FundsButton mode='deposit' getPortfolioData={getPortfolioData} getChartData={getChartData} />
            <FundsButton mode='withdraw' getPortfolioData={getPortfolioData} getChartData={getChartData} balance={portfolio?.balance} />
          </div>
        </div>
      </main>
    </>
  )
}

export default Home
