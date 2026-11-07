import { useCallback, useState } from 'react'

function countFittingRows(area: HTMLElement) {
  const headerRow = area.querySelector('thead tr')

  if (headerRow === null) {
    return null
  }

  const headerHeight = headerRow.getBoundingClientRect().height
  const bodyRow = area.querySelector('tbody tr')
  let rowHeight = headerHeight

  if (bodyRow !== null) {
    rowHeight = bodyRow.getBoundingClientRect().height
  }

  if (rowHeight === 0) {
    return null
  }

  return Math.max(1, Math.floor((area.clientHeight - headerHeight) / rowHeight))
}

export default function useFittingRows(startingCount: number) {
  const [rowCount, setRowCount] = useState(startingCount)

  const measureArea = useCallback((area: HTMLDivElement | null) => {
    if (area === null) {
      return
    }

    function updateRowCount(element: HTMLDivElement) {
      const fittingRows = countFittingRows(element)

      if (fittingRows !== null) {
        setRowCount(fittingRows)
      }
    }

    updateRowCount(area)

    const observer = new ResizeObserver(() => updateRowCount(area))
    observer.observe(area)

    const table = area.querySelector('table')

    if (table !== null) {
      observer.observe(table)
    }

    return function stopMeasuring() {
      observer.disconnect()
    }
  }, [])

  return { measureArea, rowCount }
}
