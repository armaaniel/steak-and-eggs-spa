import { useOutletContext } from 'react-router-dom'
import { gql, useQuery } from '@apollo/client'
import TraceOverviewTable from '../../components/datacat/TraceOverviewTable'
import useTransition from '../../hooks/useTransition.ts'
import type { TraceSummary, OutletContextType } from '../../lib/types.ts'

const GET_ROUTES = gql`
  query getRoutes($range: String!) {
    traceSummary(range: $range) {
      route
      cleanRoute
      p99
      totalRequests
      cacheHitRate
    }
  }
`

interface RoutesData {
  traceSummary: TraceSummary[]
}

function Routes() {
  const { range } = useOutletContext<OutletContextType>()

  const { loading, error, data } = useQuery<RoutesData>(GET_ROUTES, {
    variables: { range },
  })

  const recordsPerPage = 10
  const isLoaded = useTransition(loading, data || error)

  return (
    <div className={`dc-overview ${isLoaded && !loading ? 'loaded' : ''}`}>
      <TraceOverviewTable traceData={data?.traceSummary || []} recordsPerPage={recordsPerPage} error={error} />
    </div>
  )
}

export default Routes
