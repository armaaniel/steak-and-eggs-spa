import '../../stylesheets/desktop/activity.css'
import { useState, useEffect } from 'react'
import { toCurrency, toPnl } from '../../utils.ts'
import { resetConsumer } from '../../consumer.ts'
import Navbar from '../../components/desktop/Navbar'
import { Navigate } from 'react-router-dom'
import type { Error } from '../../types.ts'

interface Activity {
  date: string
  id: number
  market_price: string
  quantity: number
  realized_pnl: string | null
  symbol: string
  transaction_type: 'Buy' | 'Sell' | 'Deposit' | 'Withdraw'
  value: string
}

function Activity() {
  const API: String = import.meta.env.VITE_API
  const [token, setToken] = useState(localStorage.getItem('authToken'))

  const [isLoading, setIsLoading] = useState(true)
  const [activityData, setActivityData] = useState<Activity[] | null>(null)
  const [error, setError] = useState<Error>(null)
  const [currentPage, setCurrentPage] = useState(1)

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

  useEffect(() => {
    async function getActivity() {
      setError(null)
      if (!token) return
      try {
        const response = await fetch(`${API}/activitydata`, {
          headers: { authToken: token },
        })
        if (response.ok) {
          const data = await response.json()
          setActivityData(data)
        } else if (response.status === 401) {
          localStorage.removeItem('authToken')
          resetConsumer()
          setToken(null)
        } else {
          const data = await response.json()
          setActivityData(data)
          setError('Unable to fetch transactions, please try again')
        }
      } catch (error) {
        setError('Unable to fetch transactions, please try again')
        setActivityData([])
      } finally {
        setIsLoading(false)
      }
    }
    getActivity()
  }, [])

  if (!token) {
    return <Navigate to="/" />
  }

  return (
    <>
      <header>
        <Navbar />
      </header>

      <main className="home-activity">
        <div className={`activity-container ${isLoading ? '' : 'loaded'}`}>
          <table className="activity-stock-table">
            <thead>
              <tr className="activity-header-row">
                <th className="activity-row-heading">Transaction Type</th>
                <th className="activity-row-heading">Symbol</th>
                <th className="activity-row-heading">Quantity</th>
                <th className="activity-row-heading">Value</th>
                <th className="activity-row-heading">Market Price</th>
                <th className="activity-row-heading">Realized PnL</th>
                <th className="activity-row-heading">Date & Time</th>
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
                    <p className="details-text">${toCurrency(transaction?.value)}</p>
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
