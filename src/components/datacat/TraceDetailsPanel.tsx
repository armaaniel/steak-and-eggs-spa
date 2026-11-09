import { gql, useQuery } from '@apollo/client'
import DetailRows, { type DetailRow } from './DetailRows'
import TraceWaterfall from './TraceWaterfall'
import { SENTRY_EVENT_SEARCH_URL, toShortTime } from '../../lib/utils.ts'
import type { Breakdown, Trace } from '../../lib/types.ts'

const GET_TRACE_WATERFALL = gql`
  query getTraceWaterfall($id: ID!) {
    trace(id: $id) {
      id
      duration
      spans { name category start duration parent sql cached hit dropped }
      appMs
      sqlMs
      redisMs
      httpMs
      callbacksMs
      renderMs
    }
  }
`

interface Props {
  trace: Trace
}

function formatMs(ms: number, digits = 0) {
  return `${ms.toLocaleString('en-us', { maximumFractionDigits: digits })} ms`
}

function hasAnySpans(trace: Trace) {
  return (trace.spans?.length ?? 0) > 0
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

const TraceDetailsPanel = ({ trace: listed }: Props) => {
  const { loading, error, data, previousData } = useQuery<{ trace: Trace | null }>(GET_TRACE_WATERFALL, { variables: { id: listed.id } })
  const trace = { ...listed, ...data?.trace }
  const hasSpans = hasAnySpans(trace)
  const previousTrace = previousData?.trace ?? null
  let waterfallTrace: Trace | null = null

  if (hasSpans) {
    waterfallTrace = trace
  } else if (loading && previousTrace !== null && hasAnySpans(previousTrace)) {
    waterfallTrace = previousTrace
  }

  const timingRows: DetailRow[] = [
    { label: 'Status', value: trace.status },
    { label: 'Duration', value: formatMs(trace.duration, 1) },
    { label: 'DB runtime', value: formatMs(trace.dbRuntime, 1) },
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
          <p className="dc-detail-muted">{toShortTime(trace.createdAt)}</p>
        </div>

        <DetailRows rows={timingRows} inline />
        <DetailRows rows={errorRows} />

        {error && <p className="dc-detail-muted">Unable to load the timeline, please try again</p>}

        {waterfallTrace && <TraceWaterfall key={waterfallTrace.id} trace={waterfallTrace} />}

        {!loading && !hasSpans && calls.length > 0 && (
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
      </div>
    </div>
  )
}

export default TraceDetailsPanel
