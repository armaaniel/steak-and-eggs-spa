import '../stylesheets/activity.css'
import { toCurrency, toPnl } from '../lib/utils.ts'
import useApi from '../hooks/useApi'
import usePagination from '../hooks/usePagination'
import PaginationControls from '../components/PaginationControls'

interface Activity {
  date: string
  id: number
  market_price: string
  quantity: number
  realized_pnl: string | null
  symbol: string
  transaction_type: 'Buy' | 'Sell' | 'Deposit' | 'Withdraw'
  value: string
	average_price: string | null
}

function Activity() {
	const { data: activityData, error } = useApi<Activity[]>(`/activitydata`, [])
	const { currentItems, currentPage, totalPages, next, prev } = usePagination(activityData ?? [], 18)

  return (
    <>
      <main className="home-activity">
        <div className={`activity-container ${activityData ? 'loaded' : ''}`}>
          <table className="activity-stock-table">
            <thead>
              <tr className="activity-header-row">
                <th className="activity-row-heading">Transaction Type</th>
                <th className="activity-row-heading">Symbol</th>
                <th className="activity-row-heading">Quantity</th>
                <th className="activity-row-heading">Average Price</th>
                <th className="activity-row-heading">Market Price</th>
                <th className="activity-row-heading">Realized PnL</th>
                <th className="activity-row-heading">Date & Time</th>
                <th className="activity-row-heading">Value</th>
              </tr>
            </thead>

            {!error && activityData?.length === 0 && (
              <tbody>
                <tr className="activity-row">
                  <td className="activity-cell" colSpan={8}>
                    <p className="details-text">No Activities Yet</p>
                  </td>
                </tr>
              </tbody>
            )}

            {error && (
              <tbody>
                <tr className="activity-row">
                  <td className="activity-cell" colSpan={8}>
                    <p className="details-text">{error}</p>
                  </td>
                </tr>
              </tbody>
            )}

            <tbody>
              {currentItems.map((transaction) => (
                <tr key={transaction?.id} className="activity-row">
                  <td className="activity-cell">
                    <p className="details-text">{transaction?.transaction_type}</p>
                  </td>

                  <td className="activity-cell">
                    <p className="details-text">{transaction?.symbol}</p>
                  </td>

                  <td className="activity-cell">
                    <p className="details-text">{transaction?.quantity?.toLocaleString()}</p>
                  </td>

                  <td className="activity-cell">
                    <p className="details-text">{toPnl(transaction?.average_price)}</p>
                  </td>

                  <td className="activity-cell">
                    <p className="details-text">${toCurrency(transaction?.market_price)}</p>
                  </td>

                  <td className="activity-cell">
                    <p className="details-text">{toPnl(transaction?.realized_pnl)}</p>
                  </td>

                  <td className="activity-cell">
                    <p className="details-text">{transaction?.date}</p>
                  </td>

                  <td className="activity-cell">
                    <p className="details-text">${toCurrency(transaction?.value)}</p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {activityData && (
            <PaginationControls currentPage={currentPage} totalPages={totalPages} onNext={next} onPrev={prev} />
          )}
        </div>
      </main>
    </>
  )
}

export default Activity
