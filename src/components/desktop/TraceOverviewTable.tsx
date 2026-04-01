import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { TraceSummary } from '../../types.ts'
import { ApolloError } from '@apollo/client'

const TraceOverviewTable = ({ traceData, recordsPerPage, error }: { traceData: TraceSummary[]; recordsPerPage: number; error: ApolloError | undefined }) => {
  const navigate = useNavigate()

  const [sorted, setSorted] = useState(false)
  const [direction, setDirection] = useState('desc')
  const [sortField, setSortField] = useState('totalRequests')
  const [currentPage, setCurrentPage] = useState(1)

  const startRecord = (currentPage - 1) * recordsPerPage
  const endRecord = startRecord + recordsPerPage

  const sortTraces = () => {
    if (!sorted) return traceData
    return [...traceData].sort(function (a, b) {
      let aValue, bValue
      if (sortField === 'totalRequests') {
        aValue = a.totalRequests
        bValue = b.totalRequests
      } else if (sortField === 'p99') {
        aValue = a.p99
        bValue = b.p99
      } else {
				aValue = a.cacheHitRate
				bValue = b.cacheHitRate
			}
      if (direction === 'asc') {
        return aValue - bValue
      } else {
        return bValue - aValue
      }
    })
  }

  const sortedTraces = sortTraces()
  const totalPages = Math.ceil(sortedTraces.length / recordsPerPage)
  const currentPageTraces = sortedTraces.slice(startRecord, endRecord)

  const back = () => {
    setCurrentPage(currentPage - 1)
  }

  const forward = () => {
    setCurrentPage(currentPage + 1)
  }

  const handleSelect = (trace: TraceSummary) => {
    navigate(`/datacat/${trace.cleanRoute}`)
  }

  const handleSort = (field: keyof TraceSummary) => {
    setSorted(true)
    if (sortField === field) {
      if (direction === 'asc') {
        setDirection('desc')
        setCurrentPage(1)
      } else {
        setDirection('asc')
        setCurrentPage(1)
      }
    } else {
      setSortField(field)
      setDirection('desc')
      setCurrentPage(1)
    }
  }

  return (
    <>
      <table className="dc-table">
        <thead>
          <tr>
            <th className="dc-row-heading" onClick={() => setSorted(false)}>
              Route
            </th>
            <th className={sorted && sortField === 'p99' ? (direction === 'asc' ? 'dc-row-heading-asc' : 'dc-row-heading-desc') : 'dc-row-heading'} onClick={() => handleSort('p99')}>
              p99
            </th>
            <th className={sorted && sortField === 'totalRequests' ? (direction === 'asc' ? 'dc-row-heading-asc' : 'dc-row-heading-desc') : 'dc-row-heading'} onClick={() => handleSort('totalRequests')}>
              Total requests
            </th>
						<th className={sorted && sortField === 'cacheHitRate' ? (direction === 'asc' ? 'dc-row-heading-asc' : 'dc-row-heading-desc') : 'dc-row-heading'} onClick={() => handleSort('cacheHitRate')}>
						  Cache hit rate
						</th>
          </tr>
        </thead>

        {error ? (
          <tbody>
            <tr className="portfolio-row">
              <td className="dc-cell" colSpan={4}>
                <p className="details-text">Unable to load data, please try again</p>
              </td>
            </tr>
          </tbody>
        ) : (
          <tbody>
            {currentPageTraces.map((trace) => (
              <tr key={trace.route} className="dc-row" onClick={() => handleSelect(trace)}>
                <td className="dc-cell">
                  <p className="details-text">{trace.route}</p>
                </td>

                <td className="dc-cell">
                  <p className="details-text">{trace.p99.toFixed(0)} ms</p>
                </td>

                <td className="dc-cell">
                  <p className="details-text">{trace.totalRequests}</p>
                </td>
								
								<td className="dc-cell">
								  <p className="details-text">{trace.cacheHitRate != null ? `${trace.cacheHitRate}%` : '—'}</p>
								</td>
              </tr>
            ))}
          </tbody>
        )}
      </table>

      <div className="dc-pagination-container">
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
    </>
  )
}

export default TraceOverviewTable
