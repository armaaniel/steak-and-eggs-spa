import type { Column, Trace } from './types'

export const traceColumns: Column<Trace>[] = [
  { key: 'createdAt', label: 'Created At', sortable: true, render: (trace) => new Date(trace.createdAt).toLocaleString() },
  { key: 'endpoint', label: 'Endpoint', sortable: false, render: (trace) => trace.endpoint },
  { key: 'duration', label: 'Duration', sortable: true, render: (trace) => `${trace.duration?.toFixed(0)} ms` },
  { key: 'controllerMethod', label: 'Controller Method', sortable: false, render: (trace) => `${trace.controller}#${trace.action}` },
  { key: 'status', label: 'Status', sortable: false, render: (trace) => trace.status },
]
