import { useOutletContext } from 'react-router-dom'
import useEndpoint from '../../hooks/useEndpoint'
import useTransition from '../../hooks/useTransition.ts'
import EndpointNav from '../../components/datacat/EndpointNav'
import Select from '../../components/datacat/Select'
import { DATACAT_RANGE_OPTIONS } from '../../hooks/useDatacatRange'
import { gql, useQuery } from '@apollo/client'
import TraceTable from '../../components/datacat/TraceTable'
import type { Trace, OutletContextType, Column } from '../../lib/types.ts'

const CACHE_SPLIT = gql`
  query getCacheSplit($endpoint: String!, $range: String) {
    cacheSplit(endpoint: $endpoint, range: $range) {
      cached {
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
      uncached {
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
  }
`

interface CacheData {
  cacheSplit: CacheSplit
}

interface CacheSplit {
  cached: Trace[]
  uncached: Trace[]
}

function Cache() {
  const { detail, setDetail, usedApi, range, setRange } = useOutletContext<OutletContextType>()
  const selectedTrace = detail?.kind === 'trace' ? detail.trace : null
  const selectTrace = (trace: Trace) => setDetail({ kind: 'trace', trace })

  const { method, path, endpoint } = useEndpoint()
  const { loading, error, data } = useQuery<CacheData>(CACHE_SPLIT, {
    variables: { endpoint, range },
  })

  const recordsPerPage = 18
  const isLoaded = useTransition(loading, data || error)
  const columns: Column<Trace>[] = [
    { key: 'createdAt', label: 'Created At', sortable: true, render: (trace) => new Date(trace.createdAt).toLocaleString() },
    { key: 'duration', label: 'Duration', sortable: true, render: (trace) => `${trace.duration?.toFixed(0)} ms` },
  ]
  const cached = data?.cacheSplit?.cached || []
  const uncached = data?.cacheSplit?.uncached || []

  return (
    <>
      <div className="endpoint-nav-div">
        <EndpointNav method={method} path={path} endpoint={endpoint} showCache={true} apiBoolean={usedApi} />
        <Select id="range-select" label="Range" value={range} onChange={setRange} options={DATACAT_RANGE_OPTIONS} loaded={isLoaded} />
      </div>

      <div className={`cache-parent-container ${isLoaded ? 'loaded' : ''}`}>
        <div className="cache-container">
          <TraceTable traceData={cached} columns={columns} selectedTrace={selectedTrace} setSelectedTrace={selectTrace} recordsPerPage={recordsPerPage} error={error} />
          <p className="cache-text">Redis: {cached.length} traces</p>
        </div>

        <div className="cache-container">
          <TraceTable traceData={uncached} columns={columns} selectedTrace={selectedTrace} setSelectedTrace={selectTrace} recordsPerPage={recordsPerPage} error={error} />
          <p className="cache-text">
            {' '}
            {usedApi ? 'API:' : 'DB:'} {uncached.length} traces
          </p>
        </div>
      </div>
    </>
  )
}

export default Cache
