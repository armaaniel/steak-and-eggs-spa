import { useState } from 'react'
import type { Column } from '../../lib/types.ts'
import type { TraceSort } from '../../lib/traceColumns'
import { ApolloError } from '@apollo/client'
import usePagination from '../../hooks/usePagination'
import PaginationControls from '../PaginationControls'

interface TableProps<T> {
  traceData: T[]
  columns: Column<T>[]
  selectedTrace: T | null
  setSelectedTrace: (trace: T) => void
  recordsPerPage: number
  error: ApolloError | undefined
  emptyMessage?: string | undefined
  loaded?: boolean
  onSortChange?: (sort: TraceSort) => void
}

interface HasID {
  id: string | number
}

const TraceTable = <T extends HasID>({ traceData, columns, selectedTrace, setSelectedTrace, recordsPerPage, error, emptyMessage, loaded = true, onSortChange }: TableProps<T>) => {
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
        aValue = a[sortField]
        bValue = b[sortField]
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
    let newDirection = 'desc'
    if (sortField === field) newDirection = direction === 'asc' ? 'desc' : 'asc'

    setSorted(true)
    setSortField(field)
    setDirection(newDirection)
    reset()
    onSortChange?.({ field, direction: newDirection })
  }

  return (
    <>
      <table className={`overview-stock-table table-fade ${loaded ? 'loaded' : ''}`}>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key} className={`portfolio-row-heading ${column.sortable && sorted && sortField === column.key ? direction : ''}`} onClick={column.sortable ? () => handleSort(column.key) : undefined}>
                {column.label}
              </th>
            ))}
          </tr>
        </thead>

        {error ? (
          <tbody>
            <tr className="portfolio-row">
              <td className="dc-shares-cell" colSpan={columns.length}>
                <p className="details-text">Unable to load data, please try again</p>
              </td>
            </tr>
          </tbody>
        ) : currentItems.length === 0 ? (
          <tbody>
            <tr className="portfolio-row">
              <td className="dc-shares-cell" colSpan={columns.length}>
                <p className="details-text">{emptyMessage || 'No traces found'}</p>
              </td>
            </tr>
          </tbody>
        ) : (
          <tbody>
            {currentItems.map((trace) => (
              <tr key={trace.id} className={`portfolio-row ${selectedTrace?.id === trace.id ? 'selected' : ''}`} onClick={() => handleSelect(trace)}>
                {columns.map((column) => (
                  <td key={column.key} className="dc-shares-cell">
                    <p className="details-text">{column.render(trace)}</p>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        )}
      </table>

      <PaginationControls currentPage={currentPage} totalPages={totalPages} onNext={next} onPrev={prev} className={`table-fade ${loaded ? 'loaded' : ''}`} />
    </>
  )
}

export default TraceTable
