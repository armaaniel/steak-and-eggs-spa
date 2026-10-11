import { useOutletContext } from 'react-router-dom'
import { useState } from 'react'
import { gql, useQuery, type WatchQueryFetchPolicy } from '@apollo/client'
import TraceTable from '../../components/datacat/TraceTable'
import useTransition from '../../hooks/useTransition.ts'
import { traceColumns, toSortVariables, type TraceSort } from '../../lib/traceColumns'
import { bucketFetchPolicy } from '../../components/datacat/bucketChart'
import type { Trace, OutletContextType, ServiceBucket } from '../../lib/types.ts'

const GET_OVERVIEW_TRACES = gql`
  query getOverviewTraces($range: String, $bucket: ISO8601DateTime, $bucketEnd: ISO8601DateTime, $sort: TraceSort, $direction: SortDirection, $limit: Int) {
    traceList(range: $range, bucket: $bucket, bucketEnd: $bucketEnd, sort: $sort, direction: $direction, limit: $limit) {
      id
      createdAt
      endpoint
      duration
      controller
      action
      status
      dbRuntime
      breakdown
      errorClass
      errorLocation
      sentryEventId
    }
  }
`

const TRACE_LIMIT = 250

interface TraceData {
  traceList: Trace[]
}

interface Props {
  bucket: ServiceBucket | null
}

function Traces({ bucket }: Props) {
  const { detail, setDetail, range } = useOutletContext<OutletContextType>()
  const selectedTrace = detail?.kind === 'trace' ? detail.trace : null
  const selectTrace = (trace: Trace) => setDetail({ kind: 'trace', trace })

  const [sort, setSort] = useState<TraceSort | null>(null)
  const tableKey = `${range} ${bucket?.bucket ?? 'all'}`
  const [sortKey, setSortKey] = useState(tableKey)

  if (tableKey !== sortKey) {
    setSortKey(tableKey)
    setSort(null)
  }

  const [latestRange, setLatestRange] = useState<string | null>(null)
  let fetchPolicy: WatchQueryFetchPolicy = bucketFetchPolicy(bucket)

  if (bucket === null && latestRange === range) {
    fetchPolicy = 'cache-first'
  }

  const { loading, error, data, previousData } = useQuery<TraceData>(GET_OVERVIEW_TRACES, {
    variables: { range, bucket: bucket?.bucket, bucketEnd: bucket?.bucketEnd, limit: TRACE_LIMIT, ...toSortVariables(sort) },
    fetchPolicy,
  })

  if (bucket === null && data !== undefined && latestRange !== range) {
    setLatestRange(range)
  }

  const recordsPerPage = 10
  const isLoaded = useTransition(loading, data || error)
  const traces = (data ?? previousData)?.traceList || []

  return (
    <div className={`positions-container ${isLoaded ? 'loaded' : ''}`} data-ready={isLoaded}>
      <TraceTable key={tableKey} traceData={traces} columns={traceColumns} selectedTrace={selectedTrace} setSelectedTrace={selectTrace} recordsPerPage={recordsPerPage} error={error} emptyMessage={bucket ? 'No traces in this bucket' : undefined} loaded={!loading || previousData !== undefined} dimmed={loading} sortOnServer onSortChange={setSort} />
    </div>
  )
}

export default Traces
