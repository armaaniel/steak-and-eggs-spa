import '../stylesheets/home.css'
import Chart from '../components/Chart'
import PositionsTable from '../components/PositionsTable'
import FundsButton from '../components/FundsButton'
import { useEffect } from 'react'
import { toPortfolio } from '../lib/utils.ts'
import { useThrottledCallback } from 'use-debounce'
import type { Positions, ChartData } from '../lib/types.ts'
import useApi from '../hooks/useApi'
import usePriceSubscriptions from '../hooks/usePriceSubscriptions'

interface Portfolio {
  aum: string | number
  balance: string
  positions?: Positions[]
}

function Home() {

	const { data: portfolio, error, setData: setPortfolio, getData: getPortfolioData } = useApi<Portfolio>(`/portfoliodata`,
		{ aum: 'N/A', balance: 'N/A' })

	const symbols = portfolio?.positions?.map((p) => p.symbol) ?? []
	const prices = usePriceSubscriptions(symbols)
		
	const { data: chartData, getData: getChartData } = useApi<ChartData[]>(`/portfoliochart`, [
  { date: new Date().toLocaleDateString(), value: 0 },
  { date: new Date().toLocaleDateString(), value: 0 }
	])

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
