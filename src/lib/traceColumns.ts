import type { Column, Trace } from './types'

export const traceColumns: Column<Trace>[] = [
  { key: 'createdAt', label: 'Created At', sortable: true, render: (trace) => new Date(trace.createdAt).toLocaleString() },
  { key: 'endpoint', label: 'Endpoint', sortable: false, render: (trace) => trace.endpoint },
  { key: 'duration', label: 'Duration', sortable: true, render: (trace) => `${trace.duration?.toFixed(0)} ms` },
  { key: 'status', label: 'Status', sortable: true, render: (trace) => trace.status },
]

export interface TraceSort {
  field: string
  direction: string
}

const SORT_ENUMS: Record<string, string> = { createdAt: 'CREATED_AT', duration: 'DURATION', status: 'STATUS' }

export const toSortVariables = (sort: TraceSort | null) => (sort ? { sort: SORT_ENUMS[sort.field], direction: sort.direction.toUpperCase() } : {})
