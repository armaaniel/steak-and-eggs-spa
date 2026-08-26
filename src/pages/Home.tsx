import '../stylesheets/home.css'
import Chart from '../components/Chart'
import ChartRanges from '../components/ChartRanges'
import useStoredRange from '../hooks/useStoredRange'
import PositionsTable from '../components/PositionsTable'
import FundsButton from '../components/FundsButton'
import { useEffect, useMemo, useState } from 'react'
import { toPortfolio, toCurrency, toPercent } from '../lib/utils.ts'
import { useThrottledCallback } from 'use-debounce'
import type { Positions, ChartData } from '../lib/types.ts'
import useApi from '../hooks/useApi'
import usePriceSubscriptions from '../hooks/usePriceSubscriptions'

const CHART_RANGES = ['Max', '1W', '1M', '3M', 'YTD', '1Y'] as const
type ChartRange = (typeof CHART_RANGES)[number]
const DEFAULT_RANGE: ChartRange = 'Max'

const RANGE_PHRASES: Record<ChartRange, string> = {
  'Max': 'All time',
  '1W': 'Past week',
  '1M': 'Past month',
  '3M': 'Past 3 months',
  'YTD': 'Year to date',
  '1Y': 'Past year'
}

const rangeStart = (range: ChartRange, last: Date) => {
  const start = new Date(last)

  switch (range) {
    case '1W': start.setDate(start.getDate() - 7); break
    case '1M': start.setMonth(start.getMonth() - 1); break
    case '3M': start.setMonth(start.getMonth() - 3); break
    case '1Y': start.setFullYear(start.getFullYear() - 1); break
    case 'YTD': return new Date(last.getFullYear(), 0, 1)
  }

  return start
}

interface Portfolio {
  aum: string | number
  balance: string
  positions?: Positions[]
}

function Home() {

	const { data: portfolio, error, setData: setPortfolio, getData: getPortfolioData } = useApi<Portfolio>(`/portfoliodata`,
		{ aum: 'N/A', balance: 'N/A' })

	const [hoveredPoint, setHoveredPoint] = useState<ChartData | null>(null)
	const [chartRange, setChartRange] = useStoredRange('portfolio.range', CHART_RANGES, DEFAULT_RANGE)

	const selectRange = (range: ChartRange) => {
		setChartRange(range)
		setHoveredPoint(null)
	}

	const symbols = portfolio?.positions?.map((p) => p.symbol) ?? []
	const prices = usePriceSubscriptions(symbols)
		
	const { data: chartData, getData: getChartData } = useApi<ChartData[]>(`/portfoliochart`, [
  { date: new Date().toLocaleDateString(), value: 0 },
  { date: new Date().toLocaleDateString(), value: 0 }
	])

	const visibleChart = useMemo(() => {
		if (!chartData || chartData.length === 0 || chartRange === 'Max') return chartData

		const last = new Date(chartData[chartData.length - 1].date)
		const start = rangeStart(chartRange, last)
		const sliced = chartData.filter((point) => new Date(point.date).getTime() >= start.getTime())

		return sliced.length < 2 ? chartData.slice(-2) : sliced
	}, [chartData, chartRange])

	const baseline = visibleChart?.[0]?.value ?? null
	const current = hoveredPoint?.value ?? portfolio?.aum ?? null

	const percentChange = toPercent(current, baseline)
	const isPositive = Boolean(percentChange && percentChange.startsWith('+'))

	const change = baseline !== null && current !== null ? Number(current) - baseline : null
	const changeLabel = change === null || isNaN(change) || percentChange === null
		? null
		: `${change >= 0 ? '+' : '-'}$${toCurrency(Math.abs(change))} (${percentChange})`

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
            <h2 className="portfolio-value">Portfolio Value:&nbsp;</h2>
            <h2 className='portfolio-value'>{toPortfolio(hoveredPoint?.value ?? portfolio?.aum)}</h2>
          </div>

          <div className="port-change">
            <span className={`port-change-value ${isPositive ? 'positive' : 'negative'}`}>{changeLabel}</span>
            {changeLabel && <span className="port-change-phrase">{RANGE_PHRASES[chartRange]}</span>}
          </div>

          <div className="chart">
          	{visibleChart && <Chart chartData={visibleChart} onHover={setHoveredPoint} />}
          </div>

          <ChartRanges ranges={CHART_RANGES} selected={chartRange} onSelect={selectRange} />

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
