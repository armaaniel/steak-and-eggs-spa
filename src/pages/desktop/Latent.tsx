import { useOutletContext } from 'react-router-dom'
import { gql, useQuery } from '@apollo/client'
import { useEffect } from 'react'
import TraceTable from '../../components/desktop/TraceTable'
import useTransition from '../../hooks/useTransition.ts'
import type { Trace, OutletContextType, Column } from '../../types.ts'

const GET_LATENT_TRACES = gql`
  query getLatentTraces {
    latentTraces {
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
  latentTraces: Trace[]
}

function Latent() {
  const { selectedTrace, setSelectedTrace, setLoaded } = useOutletContext<OutletContextType>()

  const { loading, error, data } = useQuery<TraceData>(GET_LATENT_TRACES)

  const recordsPerPage = 18
  const isLoaded = useTransition(loading, data || error)
  const columns: Column<Trace>[] = [
    { key: 'createdAt', label: 'Created At', sortable: true, render: (trace) => new Date(trace.createdAt).toLocaleString() },
    { key: 'endpoint', label: 'Endpoint', sortable: false, render: (trace) => trace.endpoint },
    { key: 'duration', label: 'Duration', sortable: true, render: (trace) => `${trace.duration?.toFixed(0)} ms` },
    { key: 'controllerMethod', label: 'Controller Method', sortable: false, render: (trace) => `${trace.controller}#${trace.action}` },
    { key: 'status', label: 'Status', sortable: false, render: (trace) => trace.status },
  ]

  useEffect(() => {
    setLoaded(isLoaded)
  }, [isLoaded])

  return (
    <div className={`positions-container ${isLoaded ? 'loaded' : ''}`}>
      <TraceTable traceData={data?.latentTraces || []} columns={columns} selectedTrace={selectedTrace} setSelectedTrace={setSelectedTrace} recordsPerPage={recordsPerPage} error={error} />
    </div>
  )
}

export default Latent
