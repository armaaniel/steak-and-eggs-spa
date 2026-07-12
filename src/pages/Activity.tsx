import '../stylesheets/activity.css'
import { useState } from 'react'
import { toCurrency, toPnl } from '../lib/utils.ts'
import useApi from '../hooks/useApi'

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

  const [currentPage, setCurrentPage] = useState(1)
	
	const { data: activityData, error } = useApi<Activity[]>(`/activitydata`, [])

  const recordsPerPage = 15
  const startRecord = (currentPage - 1) * recordsPerPage
  const endRecord = startRecord + recordsPerPage
  const totalPages = Math.ceil((activityData?.length || 1) / recordsPerPage)
  const currentPageTraces = activityData?.slice(startRecord, endRecord)

  const back = () => {
    setCurrentPage(currentPage - 1)
  }

  const forward = () => {
    setCurrentPage(currentPage + 1)
  }
	

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
                  <td className="activity-cell" colSpan={7}>
                    <p className="details-text">No Activities Yet</p>
                  </td>
                </tr>
              </tbody>
            )}

            {error && (
              <tbody>
                <tr className="activity-row">
                  <td className="activity-cell" colSpan={7}>
                    <p className="details-text">{error}</p>
                  </td>
                </tr>
              </tbody>
            )}

            <tbody>
              {currentPageTraces?.map((transaction) => (
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
            <div className="pagination-container">
              <button className="page-button" onClick={back} disabled={currentPage === 1}>
                {' '}
                Previous{' '}
              </button>
              <span className="page-span">
                Page {currentPage} of {totalPages}
              </span>
              <button className="page-button" onClick={forward} disabled={currentPage === totalPages}>
                {' '}
                Next{' '}
              </button>
            </div>
          )}
        </div>
      </main>
    </>
  )
}

export default Activity
