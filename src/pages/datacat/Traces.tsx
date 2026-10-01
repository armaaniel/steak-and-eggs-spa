import { useOutletContext } from 'react-router-dom'
import { gql, useQuery } from '@apollo/client'
import TraceTable from '../../components/datacat/TraceTable'
import useTransition from '../../hooks/useTransition.ts'
import { traceColumns } from '../../lib/traceColumns'
import { toBucketLabel } from '../../lib/utils.ts'
import type { Column, Trace, OutletContextType, ServiceBucket } from '../../lib/types.ts'

const GET_RECENT_TRACES = gql`
  query getRecentTraces($range: String, $bucket: ISO8601DateTime, $bucketEnd: ISO8601DateTime) {
    recentTraces(range: $range, bucket: $bucket, bucketEnd: $bucketEnd) {
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
    }
  }
`

interface TraceData {
  recentTraces: Trace[]
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

  const { loading, error, data, previousData } = useQuery<TraceData>(GET_RECENT_TRACES, {
    variables: { range, bucket: bucket?.bucket, bucketEnd: bucket?.bucketEnd },
  })

  const recordsPerPage = 10
  const isLoaded = useTransition(loading, data || error)
  const traces = (data ?? previousData)?.recentTraces || []

  return (
    <div className={`positions-container ${isLoaded ? 'loaded' : ''}`}>
      {bucket && <p className="ov-traces-title">Traces from {toBucketLabel(bucket.bucket)}</p>}

      <TraceTable traceData={traces} columns={columns} selectedTrace={selectedTrace} setSelectedTrace={selectTrace} recordsPerPage={recordsPerPage} error={error} emptyMessage={bucket ? 'No traces in this bucket' : undefined} loaded={!loading} />
    </div>
  )
}

export default Traces
