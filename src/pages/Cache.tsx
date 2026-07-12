import { useOutletContext, useLocation } from 'react-router-dom'
import useEndpoint from '../hooks/useEndpoint'
import useTransition from '../hooks/useTransition.ts'
import EndpointNav from '../components/EndpointNav'
import { gql, useQuery } from '@apollo/client'
import TraceTable from '../components/TraceTable'
import type { Trace, OutletContextType, Column } from '../lib/types.ts'

const TRACE_BREAKDOWN = gql`
  query getTraceBreakdown($endpoint: String!) {
    traceBreakdown(endpoint: $endpoint) {
      redisQuery {
        id
        createdAt
        endpoint
        duration
        controller
        action
        status
        dbRuntime
        viewRuntime
        breakdown
      }
      dbApiQuery {
        id
        createdAt
        endpoint
        duration
        controller
        action
        status
        dbRuntime
        viewRuntime
        breakdown
      }
    }
  }
`

interface CacheData {
  traceBreakdown: TraceBreakdown
}

interface TraceBreakdown {
  redisQuery: Trace[]
  dbApiQuery: Trace[]
}

function Cache() {
  const location = useLocation()
  const { selectedTrace, setSelectedTrace } = useOutletContext<OutletContextType>()

  const { method, path, endpoint } = useEndpoint()
  const { loading, error, data } = useQuery<CacheData>(TRACE_BREAKDOWN, {
    variables: { endpoint },
  })

  const recordsPerPage = 18
  const isLoaded = useTransition(loading, data || error)
  const columns: Column<Trace>[] = [
    { key: 'createdAt', label: 'Created At', sortable: true, render: (trace) => new Date(trace.createdAt).toLocaleString() },
    { key: 'duration', label: 'Duration', sortable: true, render: (trace) => `${trace.duration?.toFixed(0)} ms` },
  ]
  const redisQuery = data?.traceBreakdown?.redisQuery || []
  const dbApiQuery = data?.traceBreakdown?.dbApiQuery || []
  const apiBoolean = redisQuery?.some((trace) => Object.values(trace.breakdown || {}).some((method) => 'used_api' in method))
  const persistedApiBoolean = (location.state?.apiBoolean as boolean | undefined) ?? apiBoolean

  return (
    <>
      <EndpointNav method={method} path={path} endpoint={endpoint} showCache={true} apiBoolean={persistedApiBoolean} />

      <div className={`cache-parent-container ${isLoaded ? 'loaded' : ''}`}>
        <div className="cache-container">
          <TraceTable traceData={redisQuery} columns={columns} selectedTrace={selectedTrace} setSelectedTrace={setSelectedTrace} recordsPerPage={recordsPerPage} error={error} />
          <p className="cache-text">Redis: {redisQuery.length} traces</p>
        </div>

        <div className="cache-container">
          <TraceTable traceData={dbApiQuery} columns={columns} selectedTrace={selectedTrace} setSelectedTrace={setSelectedTrace} recordsPerPage={recordsPerPage} error={error} />
          <p className="cache-text">
            {' '}
            {apiBoolean ? 'API:' : 'DB:'} {dbApiQuery.length} traces
          </p>
        </div>
      </div>
    </>
  )
}

export default Cache
