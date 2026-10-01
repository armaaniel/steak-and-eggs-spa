import { useOutletContext } from 'react-router-dom'
import { gql, useQuery } from '@apollo/client'
import { useState } from 'react'
import TraceOverviewTable from '../../components/datacat/TraceOverviewTable'
import ServiceCharts from '../../components/datacat/ServiceCharts'
import Traces from './Traces'
import useTransition from '../../hooks/useTransition.ts'
import type { DatacatRange } from '../../hooks/useDatacatRange'
import type { TraceSummary, ServiceBucket, OutletContextType } from '../../lib/types.ts'
import '../../stylesheets/datacat/endpoint.css'
import '../../stylesheets/datacat/overview.css'

const GET_OVERVIEW = gql`
  query getOverview($range: String!) {
    serviceTimeseries(range: $range) {
      bucket
      bucketEnd
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

  const [picked, setPicked] = useState<{ range: DatacatRange; bucket: ServiceBucket } | null>(null)
  const selectedBucket = picked?.range === range ? picked.bucket : null
  const selectBucket = (bucket: ServiceBucket) => setPicked(selectedBucket?.bucket === bucket.bucket ? null : { range, bucket })

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
        {error ? <p className="ov-message">Unable to load the overview, please try again</p> : <ServiceCharts buckets={buckets} selectedBucket={selectedBucket} onSelect={selectBucket} />}
      </div>

      <Traces bucket={selectedBucket} />

      <div className={`dc-overview ${isLoaded && !loading ? 'loaded' : ''}`}>
        <TraceOverviewTable traceData={traceData} recordsPerPage={recordsPerPage} error={error} />
      </div>
    </>
  )
}

export default Overview
