import { useOutletContext } from 'react-router-dom'
import { gql, useApolloClient, useQuery } from '@apollo/client'
import { useState } from 'react'
import TraceTable from '../../components/datacat/TraceTable'
import RequestsChart from '../../components/datacat/RequestsChart'
import TraceScatter from '../../components/datacat/TraceScatter'
import EndpointNav from '../../components/datacat/EndpointNav'
import Select from '../../components/datacat/Select'
import useEndpoint from '../../hooks/useEndpoint'
import { DATACAT_RANGE_OPTIONS } from '../../hooks/useDatacatRange'
import type { DatacatRange } from '../../hooks/useDatacatRange'
import useTransition from '../../hooks/useTransition.ts'
import { traceColumns, toSortVariables, type TraceSort } from '../../lib/traceColumns'
import { toBucketLabel } from '../../lib/utils.ts'
import { Y_LABEL_GAP, dropEmptyBucketInProgress, type Hover } from '../../components/datacat/bucketChart'
import type { Trace, OutletContextType, ServiceBucket, ScatterPoint } from '../../lib/types.ts'
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
    serviceTimeseries(range: $range, endpoint: $endpoint, includePartial: true) {
      bucket
      bucketEnd
      partial
      requests
      errors
      p50
      p95
      p99
    }
  }
`

const GET_SCATTER = gql`
  query getTraceScatter($endpoint: String!, $range: String, $status: Int) {
    traceScatter(endpoint: $endpoint, range: $range, status: $status) {
      id
      at
      status
      duration
      count
    }
  }
`

const GET_TRACE = gql`
  query getTrace($id: ID!) {
    trace(id: $id) {
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

const GET_CAPPED_TRACES = gql`
  query getCappedTraces($endpoint: String!, $range: String, $bucket: ISO8601DateTime, $bucketEnd: ISO8601DateTime, $status: Int, $sort: TraceSort, $direction: SortDirection) {
    traceList(endpoint: $endpoint, range: $range, bucket: $bucket, bucketEnd: $bucketEnd, status: $status, sort: $sort, direction: $direction) {
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

const TRACE_LIMIT = 1000

interface TraceData {
  traceList: Trace[]
  serviceTimeseries: ServiceBucket[]
}

interface CappedTraceData {
  traceList: Trace[]
}

interface ScatterData {
  traceScatter: ScatterPoint[]
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
  const [sort, setSort] = useState<TraceSort | null>(null)
  const [picked, setPicked] = useState<{ range: DatacatRange; bucket: ServiceBucket } | null>(null)
  const selectedBucket = picked?.range === range ? picked.bucket : null
  const selectBucket = (bucket: ServiceBucket) => setPicked(selectedBucket?.bucket === bucket.bucket ? null : { range, bucket })

  const [hover, setHover] = useState<Hover | null>(null)
  const [scatterYLabelWidth, setScatterYLabelWidth] = useState(0)
  const [requestsYLabelWidth, setRequestsYLabelWidth] = useState(0)
  const chartLeft = Math.max(scatterYLabelWidth, requestsYLabelWidth) + Y_LABEL_GAP

  const { method, path, endpoint } = useEndpoint()
  const { loading, error, data } = useQuery<TraceData>(GET_TRACES, {
    variables: { endpoint, range },
  })

  const { data: scatterData } = useQuery<ScatterData>(GET_SCATTER, {
    variables: { endpoint, range, status: statusFilter === 'all' ? null : Number(statusFilter) },
  })

  const traceList = data?.traceList || []
  const listIsComplete = traceList.length < TRACE_LIMIT
  const status = statusFilter === 'all' ? null : Number(statusFilter)
  const askServer = !listIsComplete && (selectedBucket !== null || status !== null || sort !== null)

  const { loading: cappedLoading, error: cappedError, data: cappedData } = useQuery<CappedTraceData>(GET_CAPPED_TRACES, {
    variables: { endpoint, range, bucket: selectedBucket?.bucket, bucketEnd: selectedBucket?.bucketEnd, status, ...toSortVariables(sort) },
    skip: !askServer,
  })

  const client = useApolloClient()
  const openPoint = async (point: ScatterPoint) => {
    const { data: traceData } = await client.query<{ trace: Trace | null }>({ query: GET_TRACE, variables: { id: point.id } })
    if (traceData?.trace) selectTrace(traceData.trace)
  }

  const recordsPerPage = 18
  const isLoaded = useTransition(loading, data || error)

  let tableTraces = traceList
  if (askServer) {
    tableTraces = cappedData?.traceList || []
  } else {
    if (selectedBucket) tableTraces = tableTraces.filter((trace) => inBucket(trace, selectedBucket))
    if (status !== null) tableTraces = tableTraces.filter((trace) => trace.status === status)
  }

  const statuses = [...new Set([...traceList, ...tableTraces].map((trace) => trace.status))]
  const buckets = data?.serviceTimeseries || []
  const requestBuckets = dropEmptyBucketInProgress(buckets)
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
          <TraceScatter points={scatterData?.traceScatter || []} buckets={requestBuckets} hover={hover} chartLeft={chartLeft} setYLabelWidth={setScatterYLabelWidth} selectedId={selectedTrace?.id ?? null} selectPoint={openPoint} />
        </div>

        <div className="lr-panels">
          <RequestsChart buckets={requestBuckets} hover={hover} setHover={setHover} chartLeft={chartLeft} setYLabelWidth={setRequestsYLabelWidth} selectedBucket={selectedBucket} selectBucket={selectBucket} />
        </div>
      </div>

      <div className={`positions-container ${isLoaded && !loading ? 'loaded' : ''}`}>
        {selectedBucket && <p className="ov-traces-title">Traces from {toBucketLabel(selectedBucket.bucket)}</p>}

        <TraceTable traceData={tableTraces} columns={traceColumns} selectedTrace={selectedTrace} setSelectedTrace={selectTrace} recordsPerPage={recordsPerPage} error={error || cappedError} loaded={!cappedLoading} onSortChange={setSort} />
      </div>
    </>
  )
}

export default Endpoint
