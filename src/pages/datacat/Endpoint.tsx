import { useOutletContext, useLocation } from 'react-router-dom'
import { gql, useQuery } from '@apollo/client'
import { useState, useEffect } from 'react'
import TraceTable from '../../components/datacat/TraceTable'
import EndpointNav from '../../components/datacat/EndpointNav'
import useEndpoint from '../../hooks/useEndpoint'
import useTransition from '../../hooks/useTransition.ts'
import { traceColumns } from '../../lib/traceColumns'
import type { Trace, OutletContextType } from '../../lib/types.ts'

const GET_TRACES = gql`
  query getTraces($endpoint: String!) {
    traceList(endpoint: $endpoint) {
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
`

interface TraceData {
  traceList: Trace[]
}

function Endpoint() {
  const location = useLocation()
  const { selectedTrace, setSelectedTrace, setLoaded } = useOutletContext<OutletContextType>()

  const [statusFilter, setStatusFilter] = useState<string>('all')

  const { method, path, endpoint } = useEndpoint()
  const { loading, error, data } = useQuery<TraceData>(GET_TRACES, {
    variables: { endpoint },
  })

  const recordsPerPage = 18
  const isLoaded = useTransition(loading, data || error)

  const traceList = data?.traceList || []
  const statuses = [...new Set(traceList.map((trace) => trace.status))]
  const filteredTraces = statusFilter === 'all' ? traceList : traceList.filter((trace) => String(trace.status) === statusFilter)
  const showCache = traceList?.some((trace) => Object.values(trace.breakdown || {}).some((method) => 'used_redis' in method))
  const apiBoolean = traceList?.some((trace) => Object.values(trace.breakdown || {}).some((method) => 'used_api' in method))
  const persistedShowCache = (location.state?.showCache as boolean | undefined) || showCache
  const persistedApiBoolean = (location.state?.apiBoolean as boolean | undefined) ?? apiBoolean

  useEffect(() => {
    setLoaded(isLoaded)
  }, [isLoaded])

  return (
    <>
      <div className="endpoint-nav-div">
        <EndpointNav method={method} path={path} endpoint={endpoint} showCache={persistedShowCache} apiBoolean={persistedApiBoolean} />

        <div className={`status-div ${isLoaded ? 'loaded' : ''}`}>
          <label htmlFor="status-select" className="status-label">
            Status
          </label>

          <select id="status-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">All</option>
            {statuses.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>

          <div className="select-svg-div">
            <svg width="12" height="12" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M2 3.5L5 6.5L8 3.5" stroke="rgb(104,102,100)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </div>
        </div>
      </div>

      <div className={`positions-container ${isLoaded ? 'loaded' : ''}`}>
        <TraceTable traceData={filteredTraces} columns={traceColumns} selectedTrace={selectedTrace} setSelectedTrace={setSelectedTrace} recordsPerPage={recordsPerPage} error={error} />
      </div>
    </>
  )
}

export default Endpoint
