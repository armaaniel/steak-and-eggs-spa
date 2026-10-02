import { useOutletContext } from 'react-router-dom'
import { gql, useQuery } from '@apollo/client'
import { useState } from 'react'
import TraceTable from '../../components/datacat/TraceTable'
import ServiceCharts from '../../components/datacat/ServiceCharts'
import TraceScatter from '../../components/datacat/TraceScatter'
import EndpointNav from '../../components/datacat/EndpointNav'
import Select from '../../components/datacat/Select'
import useEndpoint from '../../hooks/useEndpoint'
import { DATACAT_RANGE_OPTIONS } from '../../hooks/useDatacatRange'
import type { DatacatRange } from '../../hooks/useDatacatRange'
import useTransition from '../../hooks/useTransition.ts'
import { traceColumns } from '../../lib/traceColumns'
import { toBucketLabel } from '../../lib/utils.ts'
import type { Trace, OutletContextType, ServiceBucket } from '../../lib/types.ts'
import '../../stylesheets/datacat/overview.css'

const GET_TRACES = gql`
  query getTraces($endpoint: String!, $range: String) {
    traceList(endpoint: $endpoint, range: $range) {
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
  traceList: Trace[]
}

const BUCKETS: Record<DatacatRange, { step: number; count: number }> = {
  '1h': { step: 300, count: 12 },
  '12h': { step: 3600, count: 12 },
  '24h': { step: 3600, count: 24 },
  '7d': { step: 21600, count: 28 },
  '14d': { step: 43200, count: 28 },
  '30d': { step: 86400, count: 30 },
}

const percentile = (sorted: number[], p: number) => (sorted.length ? sorted[Math.max(0, Math.ceil(p * sorted.length) - 1)] : null)

const toBuckets = (traces: Trace[], range: DatacatRange): ServiceBucket[] => {
  const ms = BUCKETS[range].step * 1000
  const count = BUCKETS[range].count
  const finish = Math.floor(Date.now() / ms) * ms
  const start = finish - count * ms
  const groups: Trace[][] = Array.from({ length: count }, () => [])

  traces.forEach((trace) => {
    const t = new Date(trace.createdAt).getTime()
    if (t >= start && t < finish) groups[Math.floor((t - start) / ms)].push(trace)
  })

  return groups.map((group, index) => {
    const durations = group.map((trace) => trace.duration).sort((a, b) => a - b)

    return {
      bucket: new Date(start + index * ms).toISOString(),
      bucketEnd: new Date(start + (index + 1) * ms).toISOString(),
      requests: group.length,
      errors: group.filter((trace) => trace.status >= 500).length,
      p50: percentile(durations, 0.5),
      p95: percentile(durations, 0.95),
      p99: percentile(durations, 0.99),
    }
  })
}

const inBucket = (trace: Trace, bucket: ServiceBucket) => {
  const t = new Date(trace.createdAt).getTime()
  return t >= new Date(bucket.bucket).getTime() && t < new Date(bucket.bucketEnd).getTime()
}

function Endpoint() {
  const { detail, setDetail, usedRedis, usedApi, range, setRange } = useOutletContext<OutletContextType>()
  const selectedTrace = detail?.kind === 'trace' ? detail.trace : null
  const selectTrace = (trace: Trace) => setDetail({ kind: 'trace', trace })

  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [picked, setPicked] = useState<{ range: DatacatRange; bucket: ServiceBucket } | null>(null)
  const selectedBucket = picked?.range === range ? picked.bucket : null
  const selectBucket = (bucket: ServiceBucket) => setPicked(selectedBucket?.bucket === bucket.bucket ? null : { range, bucket })

  const { method, path, endpoint } = useEndpoint()
  const { loading, error, data } = useQuery<TraceData>(GET_TRACES, {
    variables: { endpoint, range },
  })

  const recordsPerPage = 18
  const isLoaded = useTransition(loading, data || error)

  const traceList = data?.traceList || []
  const statuses = [...new Set(traceList.map((trace) => trace.status))]
  const buckets = toBuckets(traceList, range)
  const from = new Date(buckets[0].bucket).getTime()
  const to = new Date(buckets[buckets.length - 1].bucketEnd).getTime()
  const statusTraces = statusFilter === 'all' ? traceList : traceList.filter((trace) => String(trace.status) === statusFilter)
  const filteredTraces = selectedBucket ? statusTraces.filter((trace) => inBucket(trace, selectedBucket)) : statusTraces
  const statusOptions = [{ value: 'all', label: 'All' }, ...statuses.map((status) => ({ value: String(status), label: String(status) }))]

  return (
    <>
      <div className="endpoint-nav-div">
        <EndpointNav method={method} path={path} endpoint={endpoint} showCache={usedRedis} apiBoolean={usedApi} />

        <div className="endpoint-filters">
          <Select id="status-select" label="Status" value={statusFilter} onChange={setStatusFilter} options={statusOptions} loaded={isLoaded} />
          <Select id="range-select" label="Range" value={range} onChange={setRange} options={DATACAT_RANGE_OPTIONS} loaded={isLoaded} />
        </div>
      </div>

      <div className={`positions-container ${isLoaded && !loading ? 'loaded' : ''}`}>
        <div className="lr-panels">
          <TraceScatter traces={statusTraces} from={from} to={to} selectedId={selectedTrace?.id ?? null} onSelect={selectTrace} />
        </div>

        <ServiceCharts buckets={buckets} selectedBucket={selectedBucket} onSelect={selectBucket} latency={false} />
      </div>

      <div className={`positions-container ${isLoaded && !loading ? 'loaded' : ''}`}>
        {selectedBucket && <p className="ov-traces-title">Traces from {toBucketLabel(selectedBucket.bucket)}</p>}

        <TraceTable traceData={filteredTraces} columns={traceColumns} selectedTrace={selectedTrace} setSelectedTrace={selectTrace} recordsPerPage={recordsPerPage} error={error} />
      </div>
    </>
  )
}

export default Endpoint
