import { useState } from 'react'
import type { Column } from '../../lib/types.ts'
import { ApolloError } from '@apollo/client'
import usePagination from '../../hooks/usePagination'
import PaginationControls from '../PaginationControls'

interface TableProps<T> {
  traceData: T[]
  columns: Column<T>[]
  selectedTrace: T | null
  setSelectedTrace: React.Dispatch<React.SetStateAction<T | null>>
  recordsPerPage: number
  error: ApolloError | undefined
  emptyMessage?: string | undefined
}

interface HasID {
  id: string | number
}

const TraceTable = <T extends HasID>({ traceData, columns, selectedTrace, setSelectedTrace, recordsPerPage, error, emptyMessage }: TableProps<T>) => {
  const [sorted, setSorted] = useState(false)
  const [direction, setDirection] = useState('desc')
  const [sortField, setSortField] = useState('createdAt')

  const sortTraces = () => {
    if (!sorted) return traceData
    return [...traceData].sort(function (a: any, b: any) {
      let aValue, bValue
      if (sortField === 'createdAt') {
        aValue = new Date(a.createdAt)
        bValue = new Date(b.createdAt)
      } else {
        aValue = a.duration
        bValue = b.duration
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

  const handleSelect = (trace: T) => {
    setSelectedTrace(trace)
  }

  const handleSort = (field: string) => {
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
      <table className="overview-stock-table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key} className={column.sortable && sorted && sortField === `${column.key}` ? (direction === 'asc' ? 'portfolio-row-heading-asc' : 'portfolio-row-heading-desc') : 'portfolio-row-heading'} onClick={column.sortable ? () => handleSort(column.key) : undefined}>
                {column.label}
              </th>
            ))}
          </tr>
        </thead>

        {error ? (
          <tbody>
            <tr className="portfolio-row">
              <td className="shares-cell" colSpan={columns.length}>
                <p className="details-text">Unable to load data, please try again</p>
              </td>
            </tr>
          </tbody>
        ) : currentItems.length === 0 ? (
          <tbody>
            <tr className="portfolio-row">
              <td className="shares-cell" colSpan={columns.length}>
                <p className="details-text">{emptyMessage || 'No traces found'}</p>
              </td>
            </tr>
          </tbody>
        ) : (
          <tbody>
            {currentItems.map((trace) => (
              <tr key={trace.id} className={selectedTrace?.id === trace.id ? 'portfolio-row-selected' : 'portfolio-row'} onClick={() => handleSelect(trace)}>
                {columns.map((column) => (
                  <td key={column.key} className="shares-cell">
                    <p className="details-text">{column.render(trace)}</p>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        )}
      </table>

      <PaginationControls currentPage={currentPage} totalPages={totalPages} onNext={next} onPrev={prev} />
    </>
  )
}

export default TraceTable
