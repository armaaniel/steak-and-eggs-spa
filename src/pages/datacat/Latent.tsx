import { useOutletContext } from 'react-router-dom'
import { gql, useQuery } from '@apollo/client'
import { useEffect } from 'react'
import TraceTable from '../../components/datacat/TraceTable'
import useTransition from '../../hooks/useTransition.ts'
import { traceColumns } from '../../lib/traceColumns'
import type { Trace, OutletContextType } from '../../lib/types.ts'

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

  useEffect(() => {
    setLoaded(isLoaded)
  }, [isLoaded])

  return (
    <div className={`positions-container ${isLoaded ? 'loaded' : ''}`}>
      <TraceTable traceData={data?.latentTraces || []} columns={traceColumns} selectedTrace={selectedTrace} setSelectedTrace={setSelectedTrace} recordsPerPage={recordsPerPage} error={error} />
    </div>
  )
}

export default Latent
