import { gql, useQuery } from '@apollo/client'
import TraceOverviewTable from '../../components/desktop/TraceOverviewTable'
import useTransition from '../../hooks/useTransition.ts'
import type { TraceSummary } from '../../types.ts'

const TRACE_SUMMARY = gql`
  query fetchTraceSummary {
    traceSummary {
      route
      cleanRoute
      p99
      totalRequests
    }
  }
`

interface SummaryData {
  traceSummary: TraceSummary[]
}

function AllRoutes() {
  const { loading, error, data } = useQuery<SummaryData>(TRACE_SUMMARY)

  const recordsPerPage = 10
  const traceData = data?.traceSummary || []
  const isLoaded = useTransition(loading, data || error)

  return (
    <>
      <div className={`endpoint-header-container ${traceData.length > 0 ? 'loaded' : ''}`}></div>

      <div className={`dc-overview ${isLoaded ? 'loaded' : ''}`}>
        <TraceOverviewTable traceData={traceData} recordsPerPage={recordsPerPage} error={error} />
      </div>
    </>
  )
}

export default AllRoutes
