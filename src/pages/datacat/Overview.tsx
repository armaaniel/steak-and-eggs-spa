import { gql, useQuery } from '@apollo/client'
import { useState } from 'react'
import TraceOverviewTable from '../../components/datacat/TraceOverviewTable'
import ServiceCharts from '../../components/datacat/ServiceCharts'
import Select from '../../components/datacat/Select'
import useTransition from '../../hooks/useTransition.ts'
import type { TraceSummary, ServiceBucket } from '../../lib/types.ts'
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

const ranges = ['1h', '12h', '24h', '7d', '14d', '30d']
const rangeOptions = ranges.map((range) => ({ value: range, label: range }))

function Overview() {
  const [range, setRange] = useState('24h')

  const { loading, error, data } = useQuery<OverviewData>(GET_OVERVIEW, {
    variables: { range },
  })

  const recordsPerPage = 10
  const isLoaded = useTransition(loading, data || error)

  const buckets = data?.serviceTimeseries || []
  const traceData = data?.traceSummary || []

  return (
    <>
      <div className="ov-header">
        <Select id="range-select" label="Range" value={range} onChange={setRange} options={rangeOptions} loaded={isLoaded} />
      </div>

      <div className={`positions-container ${isLoaded && !loading ? 'loaded' : ''}`}>
        {error ? <p className="ov-message">Unable to load the overview, please try again</p> : <ServiceCharts buckets={buckets} />}
      </div>

      <div className={`dc-overview ${isLoaded ? 'loaded' : ''}`}>
        <TraceOverviewTable traceData={traceData} recordsPerPage={recordsPerPage} error={error} />
      </div>
    </>
  )
}

export default Overview
