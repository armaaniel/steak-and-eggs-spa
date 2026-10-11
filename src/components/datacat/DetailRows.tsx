import type { ReactNode } from 'react'

export interface DetailRow {
  label: string
  value: ReactNode
}

interface Props {
  rows: DetailRow[]
  inline?: boolean
}

const DetailRows = ({ rows, inline = false }: Props) => {
  if (rows.length === 0) {
    return null
  }

  return (
    <dl className={`dc-detail-rows ${inline ? 'inline' : ''}`}>
      {rows.map((row) => (
        <div key={row.label}>
          <dt>{row.label}</dt>
          <dd>{row.value}</dd>
        </div>
      ))}
    </dl>
  )
}

export default DetailRows
