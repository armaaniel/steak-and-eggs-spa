import { gql, useQuery } from '@apollo/client'
import DetailRows, { type DetailRow } from './DetailRows'
import TraceWaterfall from './TraceWaterfall'
import { SENTRY_EVENT_SEARCH_URL, toShortTime } from '../../lib/utils.ts'
import type { Trace } from '../../lib/types.ts'

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
      errorClass
      errorLocation
      sentryEventId
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

function buildErrorRows(trace: Trace) {
  const rows: DetailRow[] = []

  if (trace.errorClass) rows.push({ label: 'Error', value: trace.errorClass })
  if (trace.errorLocation) rows.push({ label: 'Error location', value: trace.errorLocation })

  if (trace.sentryEventId) {
    rows.push({
      label: 'Sentry',
      value: (
        <a href={`${SENTRY_EVENT_SEARCH_URL}${trace.sentryEventId}`} target="_blank" rel="noreferrer">
          {trace.sentryEventId}
        </a>
      ),
    })
  }

  return rows
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
  ]

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

        {error && <p className="dc-detail-muted">Unable to load the timeline, please try again</p>}

        {waterfallTrace && (
          <div className="waterfall-fade">
            <TraceWaterfall trace={waterfallTrace} />
            <DetailRows rows={buildErrorRows(waterfallTrace)} />
          </div>
        )}

        {!waterfallTrace && !loading && <DetailRows rows={buildErrorRows(trace)} />}
      </div>
    </div>
  )
}

export default TraceDetailsPanel
