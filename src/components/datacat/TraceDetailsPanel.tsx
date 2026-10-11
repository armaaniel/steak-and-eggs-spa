import DetailRows, { type DetailRow } from './DetailRows'
import type { Breakdown, Trace } from '../../lib/types.ts'

interface Props {
  trace: Trace
}

const SENTRY_EVENT_SEARCH_URL = 'https://armaaniel.sentry.io/issues/?query='

function formatMs(ms: number, digits = 0) {
  return `${ms.toLocaleString('en-us', { maximumFractionDigits: digits })} ms`
}

function describeCall(call: Breakdown) {
  const parts: string[] = []

  if (call.operation !== undefined) parts.push(call.operation)
  if (call.range !== undefined) parts.push(call.range)
  if (call.used_redis !== undefined) parts.push(call.used_redis ? 'cache hit' : 'cache miss')
  if (call.used_db) parts.push('db')
  if (call.used_api) parts.push('api')

  return parts.join(' · ')
}

const TraceDetailsPanel = ({ trace }: Props) => {
  const timingRows: DetailRow[] = [
    { label: 'Status', value: trace.status },
    { label: 'Duration', value: formatMs(trace.duration) },
    { label: 'DB runtime', value: formatMs(trace.dbRuntime) },
  ]

  const errorRows: DetailRow[] = []

  if (trace.errorClass) errorRows.push({ label: 'Error', value: trace.errorClass })
  if (trace.errorLocation) errorRows.push({ label: 'Error location', value: trace.errorLocation })

  if (trace.sentryEventId) {
    errorRows.push({
      label: 'Sentry',
      value: (
        <a href={`${SENTRY_EVENT_SEARCH_URL}${trace.sentryEventId}`} target="_blank" rel="noreferrer">
          {trace.sentryEventId}
        </a>
      ),
    })
  }

  const calls = Object.entries(trace.breakdown ?? {})

  return (
    <div className="sidebar-button-container two">
      <div className="trace-details">
        <div>
          <p>{trace.endpoint}</p>
          <p className="dc-detail-muted">
            {trace.controller}#{trace.action}
          </p>
        </div>

        <DetailRows rows={timingRows} inline />
        <DetailRows rows={errorRows} />

        {calls.length > 0 && (
          <div className="dc-detail-list">
            <p className="dc-detail-label">Service calls</p>
            {calls.map(([name, call]) => (
              <div key={name}>
                <p className="dc-detail-item">
                  <span>{name}</span>
                  <span>{formatMs(call.duration, 1)}</span>
                </p>
                {describeCall(call) !== '' && <p className="dc-detail-muted">{describeCall(call)}</p>}
              </div>
            ))}
          </div>
        )}

        <DetailRows
          rows={[
            { label: 'Created', value: new Date(trace.createdAt).toLocaleString() },
            { label: 'ID', value: trace.id },
          ]}
          inline
        />
      </div>
    </div>
  )
}

export default TraceDetailsPanel
