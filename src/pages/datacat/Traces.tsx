import { useOutletContext } from 'react-router-dom'
import { useState } from 'react'
import { gql, useQuery } from '@apollo/client'
import TraceTable from '../../components/datacat/TraceTable'
import useTransition from '../../hooks/useTransition.ts'
import { traceColumns, toSortVariables, type TraceSort } from '../../lib/traceColumns'
import { toBucketLabel } from '../../lib/utils.ts'
import { bucketFetchPolicy } from '../../components/datacat/bucketChart'
import type { Column, Trace, OutletContextType, ServiceBucket } from '../../lib/types.ts'

const GET_OVERVIEW_TRACES = gql`
  query getOverviewTraces($range: String, $bucket: ISO8601DateTime, $bucketEnd: ISO8601DateTime, $sort: TraceSort, $direction: SortDirection) {
    traceList(range: $range, bucket: $bucket, bucketEnd: $bucketEnd, sort: $sort, direction: $direction) {
      id
      createdAt
      endpoint
      duration
      controller
      action
      status
      source
      dbRuntime
      viewRuntime
      breakdown
      errorClass
      errorLocation
      sentryEventId
    }
  }
`

interface TraceData {
  traceList: Trace[]
}

interface Props {
  bucket: ServiceBucket | null
}

const sourceColumn: Column<Trace> = { key: 'source', label: 'Source', sortable: false, render: (trace) => trace.source ?? '-' }

const columns = [...traceColumns.slice(0, 2), sourceColumn, ...traceColumns.slice(2)]

function Traces({ bucket }: Props) {
  const { detail, setDetail, range } = useOutletContext<OutletContextType>()
  const selectedTrace = detail?.kind === 'trace' ? detail.trace : null
  const selectTrace = (trace: Trace) => setDetail({ kind: 'trace', trace })

  const [sort, setSort] = useState<TraceSort | null>(null)
  const [sortBucket, setSortBucket] = useState<string | null>(null)
  const bucketKey = bucket?.bucket ?? null

  if (bucketKey !== sortBucket) {
    setSortBucket(bucketKey)
    setSort(null)
  }

  const { loading, error, data, previousData } = useQuery<TraceData>(GET_OVERVIEW_TRACES, {
    variables: { range, bucket: bucket?.bucket, bucketEnd: bucket?.bucketEnd, ...toSortVariables(sort) },
    fetchPolicy: bucketFetchPolicy(bucket),
  })

  const recordsPerPage = 10
  const isLoaded = useTransition(loading, data || error)
  const traces = (data ?? previousData)?.traceList || []

  return (
    <div className={`positions-container ${isLoaded ? 'loaded' : ''}`}>
      {bucket && <p className={`ov-traces-title table-fade ${loading ? '' : 'loaded'}`}>Traces from {toBucketLabel(bucket.bucket)}</p>}

      <TraceTable key={bucketKey ?? 'all'} traceData={traces} columns={columns} selectedTrace={selectedTrace} setSelectedTrace={selectTrace} recordsPerPage={recordsPerPage} error={error} emptyMessage={bucket ? 'No traces in this bucket' : undefined} loaded={!loading || previousData !== undefined} dimmed={loading} sortOnServer onSortChange={setSort} />
    </div>
  )
}

export default Traces
