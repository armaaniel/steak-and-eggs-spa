import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { TraceSummary } from '../../lib/types.ts'
import { ApolloError } from '@apollo/client'
import usePagination from '../../hooks/usePagination'
import PaginationControls from '../PaginationControls'

const TraceOverviewTable = ({ traceData, recordsPerPage, error }: { traceData: TraceSummary[]; recordsPerPage: number; error: ApolloError | undefined }) => {
  const navigate = useNavigate()

  const [sorted, setSorted] = useState(false)
  const [direction, setDirection] = useState('desc')
  const [sortField, setSortField] = useState('totalRequests')

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
				aValue = a.cacheHitRate ?? -1
				bValue = b.cacheHitRate ?? -1
			}
      if (direction === 'asc') {
        return aValue - bValue
      } else {
        return bValue - aValue
      }
    })
  }

  const sortedTraces = sortTraces()
  const { currentItems, currentPage, totalPages, next, prev, reset } = usePagination(sortedTraces, recordsPerPage)

  const handleSelect = (trace: TraceSummary) => {
    navigate(`/datacat/${trace.cleanRoute}`)
  }

  const handleSort = (field: keyof TraceSummary) => {
    setSorted(true)
    if (sortField === field) {
      setDirection(direction === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setDirection('desc')
    }
    reset()
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
						<th className={sorted && sortField === 'cacheHitRate' ? (direction === 'asc' ? 'dc-row-heading-asc' : 'dc-row-heading-desc') : 'dc-row-heading'} onClick={() => handleSort('cacheHitRate')}>
						  Cache hit rate
						</th>
            <th className={sorted && sortField === 'totalRequests' ? (direction === 'asc' ? 'dc-row-heading-asc' : 'dc-row-heading-desc') : 'dc-row-heading'} onClick={() => handleSort('totalRequests')}>
              Total requests
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
            {currentItems.map((trace) => (
              <tr key={trace.route} className="dc-row" onClick={() => handleSelect(trace)}>
                <td className="dc-cell">
                  <p className="details-text">{trace.route}</p>
                </td>

                <td className="dc-cell">
                  <p className="details-text">{trace.p99.toFixed(0)} ms</p>
                </td>

								<td className="dc-cell">
								  <p className="details-text">{trace.cacheHitRate ? `${trace.cacheHitRate}%` : '—'}</p>
								</td>

                <td className="dc-cell">
                  <p className="details-text">{trace.totalRequests}</p>
                </td>
              </tr>
            ))}
          </tbody>
        )}
      </table>

      <PaginationControls currentPage={currentPage} totalPages={totalPages} onNext={next} onPrev={prev} className="dc-pagination-container" />
    </>
  )
}

export default TraceOverviewTable
