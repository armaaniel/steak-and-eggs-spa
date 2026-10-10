import { useOutletContext } from 'react-router-dom'
import { gql, useQuery } from '@apollo/client'
import { useState } from 'react'
import LatencyChart from '../../components/datacat/LatencyChart'
import RequestsChart from '../../components/datacat/RequestsChart'
import Traces from './Traces'
import useTransition from '../../hooks/useTransition.ts'
import type { DatacatRange } from '../../hooks/useDatacatRange'
import { Y_LABEL_GAP, dropEmptyBucketInProgress, type Hover } from '../../components/datacat/bucketChart'
import type { ServiceBucket, OutletContextType } from '../../lib/types.ts'
import '../../stylesheets/datacat/endpoint.css'
import '../../stylesheets/datacat/overview.css'

const GET_OVERVIEW = gql`
  query getOverview($range: String!) {
    serviceTimeseries(range: $range, includePartial: true) {
      bucket
      bucketEnd
      requests
      errors
      p50
      p95
      p99
    }
  }
`

interface OverviewData {
  serviceTimeseries: ServiceBucket[]
}

function Overview() {
  const { range } = useOutletContext<OutletContextType>()

  const [picked, setPicked] = useState<{ range: DatacatRange; bucket: ServiceBucket } | null>(null)
  const selectedBucket = picked?.range === range ? picked.bucket : null
  const selectBucket = (bucket: ServiceBucket) => setPicked(selectedBucket?.bucket === bucket.bucket ? null : { range, bucket })

  const [hover, setHover] = useState<Hover | null>(null)

  const [latencyYLabelWidth, setLatencyYLabelWidth] = useState(0)
  const [requestsYLabelWidth, setRequestsYLabelWidth] = useState(0)
  const chartLeft = Math.max(latencyYLabelWidth, requestsYLabelWidth) + Y_LABEL_GAP

  const { loading, error, data } = useQuery<OverviewData>(GET_OVERVIEW, {
    variables: { range },
  })

  const isLoaded = useTransition(loading, data || error)

  const buckets = dropEmptyBucketInProgress(data?.serviceTimeseries || [])

  return (
    <>
      <div className={`positions-container ${isLoaded && !loading ? 'loaded' : ''}`}>
        {error ? (
          <p className="ov-message">Unable to load the overview, please try again</p>
        ) : (
          <>
            <div className="lr-panels">
              <LatencyChart buckets={buckets} hover={hover} setHover={setHover} chartLeft={chartLeft} setYLabelWidth={setLatencyYLabelWidth} selectedBucket={selectedBucket} />
            </div>
            <div className="lr-panels">
              <RequestsChart buckets={buckets} hover={hover} setHover={setHover} chartLeft={chartLeft} setYLabelWidth={setRequestsYLabelWidth} selectedBucket={selectedBucket} selectBucket={selectBucket} />
            </div>
          </>
        )}
      </div>

      <Traces key={range} bucket={selectedBucket} />
    </>
  )
}

export default Overview
