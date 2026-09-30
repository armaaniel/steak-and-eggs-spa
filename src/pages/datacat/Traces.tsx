import { useOutletContext } from 'react-router-dom'
import { gql, useQuery } from '@apollo/client'
import TraceTable from '../../components/datacat/TraceTable'
import useTransition from '../../hooks/useTransition.ts'
import { traceColumns } from '../../lib/traceColumns'
import type { Column, Trace, OutletContextType } from '../../lib/types.ts'

const GET_RECENT_TRACES = gql`
  query getRecentTraces($range: String) {
    recentTraces(range: $range) {
      id
      createdAt
      endpoint
      duration
      controller
      action
      status
      source
      dbRuntime
      viewRuntime
      breakdown
    }
  }
`

interface TraceData {
  recentTraces: Trace[]
}

const sourceColumn: Column<Trace> = { key: 'source', label: 'Source', sortable: false, render: (trace) => trace.source ?? '-' }

const columns = [...traceColumns.slice(0, 2), sourceColumn, ...traceColumns.slice(2)]

function Traces() {
  const { detail, setDetail, range } = useOutletContext<OutletContextType>()
  const selectedTrace = detail?.kind === 'trace' ? detail.trace : null
  const selectTrace = (trace: Trace) => setDetail({ kind: 'trace', trace })

  const { loading, error, data } = useQuery<TraceData>(GET_RECENT_TRACES, {
    variables: { range },
  })

  const recordsPerPage = 18
  const isLoaded = useTransition(loading, data || error)

  return (
    <div className={`positions-container ${isLoaded && !loading ? 'loaded' : ''}`}>
      <TraceTable traceData={data?.recentTraces || []} columns={columns} selectedTrace={selectedTrace} setSelectedTrace={selectTrace} recordsPerPage={recordsPerPage} error={error} />
    </div>
  )
}

export default Traces
