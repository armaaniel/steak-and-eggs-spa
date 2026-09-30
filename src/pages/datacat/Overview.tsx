import { useOutletContext } from 'react-router-dom'
import { gql, useQuery } from '@apollo/client'
import TraceOverviewTable from '../../components/datacat/TraceOverviewTable'
import ServiceCharts from '../../components/datacat/ServiceCharts'
import useTransition from '../../hooks/useTransition.ts'
import type { TraceSummary, ServiceBucket, OutletContextType } from '../../lib/types.ts'
import '../../stylesheets/datacat/endpoint.css'
import '../../stylesheets/datacat/overview.css'

const GET_OVERVIEW = gql`
  query getOverview($range: String!) {
    serviceTimeseries(range: $range) {
      bucket
      requests
      errors
      p50
      p95
      p99
    }
    traceSummary(range: $range) {
      route
      cleanRoute
      p99
      totalRequests
      cacheHitRate
    }
  }
`

interface OverviewData {
  serviceTimeseries: ServiceBucket[]
  traceSummary: TraceSummary[]
}

function Overview() {
  const { range } = useOutletContext<OutletContextType>()

  const { loading, error, data } = useQuery<OverviewData>(GET_OVERVIEW, {
    variables: { range },
  })

  const recordsPerPage = 10
  const isLoaded = useTransition(loading, data || error)

  const buckets = data?.serviceTimeseries || []
  const traceData = data?.traceSummary || []

  return (
    <>
      <div className={`positions-container ${isLoaded && !loading ? 'loaded' : ''}`}>
        {error ? <p className="ov-message">Unable to load the overview, please try again</p> : <ServiceCharts buckets={buckets} />}
      </div>

      <div className={`dc-overview ${isLoaded && !loading ? 'loaded' : ''}`}>
        <TraceOverviewTable traceData={traceData} recordsPerPage={recordsPerPage} error={error} />
      </div>
    </>
  )
}

export default Overview
