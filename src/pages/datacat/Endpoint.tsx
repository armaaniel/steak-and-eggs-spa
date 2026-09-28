import { useOutletContext } from 'react-router-dom'
import { gql, useQuery } from '@apollo/client'
import { useState } from 'react'
import TraceTable from '../../components/datacat/TraceTable'
import EndpointNav from '../../components/datacat/EndpointNav'
import Select from '../../components/datacat/Select'
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
  const { detail, setDetail, usedRedis, usedApi } = useOutletContext<OutletContextType>()
  const selectedTrace = detail?.kind === 'trace' ? detail.trace : null
  const selectTrace = (trace: Trace) => setDetail({ kind: 'trace', trace })

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
  const statusOptions = [{ value: 'all', label: 'All' }, ...statuses.map((status) => ({ value: status, label: String(status) }))]

  return (
    <>
      <div className="endpoint-nav-div">
        <EndpointNav method={method} path={path} endpoint={endpoint} showCache={usedRedis} apiBoolean={usedApi} />

        <Select id="status-select" label="Status" value={statusFilter} onChange={setStatusFilter} options={statusOptions} loaded={isLoaded} />
      </div>

      <div className={`positions-container ${isLoaded ? 'loaded' : ''}`}>
        <TraceTable traceData={filteredTraces} columns={traceColumns} selectedTrace={selectedTrace} setSelectedTrace={selectTrace} recordsPerPage={recordsPerPage} error={error} />
      </div>
    </>
  )
}

export default Endpoint
