import '../../stylesheets/desktop/home.css'
import '../../stylesheets/desktop/authenticated.css'
import Chart from '../../components/desktop/Chart'
import PositionsTable from '../../components/desktop/PositionsTable'
import FundsButton from '../../components/desktop/FundsButton'
import { useState, useEffect } from 'react'
import { toPortfolio } from '../../utils.ts'
import { getConsumer } from '../../consumer.ts'
import { useThrottledCallback } from 'use-debounce'
import type { Positions, Prices, Error } from '../../types.ts'
import useApi from '../../hooks/useApi'
import apiFetch from '../../apiFetch'

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

  const [prices, setPrices] = useState<Prices>({})
  const [portfolio, setPortfolio] = useState<Portfolio | undefined>(undefined)
  const [error, setError] = useState<Error>(null)
	
	async function getPortfolioData() {
		setError(null)
		try {
			const response = await apiFetch(`/portfoliodata`)
			if (!response) return
			if (response.ok) {
				const data = await response.json()
				setPortfolio(data)
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
	
  useEffect(() => {
    getPortfolioData()
  }, [])		
	
	const { data: chartData, getData: getChartData } = useApi<ChartData[]>(`/portfoliochart`, [
  { date: new Date().toLocaleDateString(), value: 0 },
  { date: new Date().toLocaleDateString(), value: 0 }
	])

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

  return (
    <>
      <main className={`home ${portfolio ? 'loaded' : ''}`}>
        <div className="home-left">
          <div className="port-value">
            <h2 className="portfolio-value">Your Portfolio Value Is:&nbsp;</h2>
            <h2 className='portfolio-value'>{toPortfolio(portfolio?.aum)}</h2>
          </div>

          <div className="chart">
          	{chartData && <Chart chartData={chartData} />}
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
