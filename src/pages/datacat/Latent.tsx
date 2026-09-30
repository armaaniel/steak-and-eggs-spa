import { useOutletContext } from 'react-router-dom'
import { gql, useQuery } from '@apollo/client'
import TraceTable from '../../components/datacat/TraceTable'
import useTransition from '../../hooks/useTransition.ts'
import { traceColumns } from '../../lib/traceColumns'
import type { Trace, OutletContextType } from '../../lib/types.ts'

const GET_LATENT_TRACES = gql`
  query getLatentTraces($range: String) {
    latentTraces(range: $range) {
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
  const { detail, setDetail, range } = useOutletContext<OutletContextType>()
  const selectedTrace = detail?.kind === 'trace' ? detail.trace : null
  const selectTrace = (trace: Trace) => setDetail({ kind: 'trace', trace })

  const { loading, error, data } = useQuery<TraceData>(GET_LATENT_TRACES, {
    variables: { range },
  })

  const recordsPerPage = 18
  const isLoaded = useTransition(loading, data || error)

  return (
    <div className={`positions-container ${isLoaded && !loading ? 'loaded' : ''}`}>
      <TraceTable traceData={data?.latentTraces || []} columns={traceColumns} selectedTrace={selectedTrace} setSelectedTrace={selectTrace} recordsPerPage={recordsPerPage} error={error} />
    </div>
  )
}

export default Latent
