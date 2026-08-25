import { gql, useQuery } from '@apollo/client'
import { useState } from 'react'
import TraceTable from '../../components/datacat/TraceTable'
import IngesterTimeline from '../../components/datacat/IngesterTimeline'
import IngesterRateChart from '../../components/datacat/IngesterRateChart'
import IngesterLagChart from '../../components/datacat/IngesterLagChart'
import useTransition from '../../hooks/useTransition.ts'
import { toDuration } from '../../lib/utils.ts'
import '../../stylesheets/datacat/ingester.css'
import type { Column, IngesterUptime, IngesterSpan, IngesterRatePoint, IngesterLagPoint, IngesterBoot, IngesterConnection, IngesterCause } from '../../lib/types.ts'

const GET_INGESTER = gql`
  query getIngester($hours: Int!) {
    ingesterUptime(hours: $hours) {
      pct
      streamingSeconds
      idleSeconds
      downSeconds
      windowSeconds
    }
    ingesterSpans(hours: $hours) {
      at
      bootId
      connectionId
      state
      seconds
    }
    ingesterRate(hours: $hours) {
      at
      eventsPerSec
      framesPerSec
      maxLagMs
      symbols
    }
    ingesterLag(hours: $hours) {
      at
      maxExcessMs
      meanExcessMs
      sampledEvents
      symbols
    }
    ingesterBoots(hours: $hours) {
      bootId
      startedAt
      lastSeenAt
      durationSeconds
      connections
      reconnects
      cleanExit
      events
      peakLagMs
    }
    ingesterConnections(hours: $hours) {
      connectionId
      bootId
      spawnedAt
      firstMessageAt
      lastSeenAt
      endedAt
      endedBy
      connectSeconds
      durationSeconds
    }
    ingesterCauses(hours: $hours) {
      cause
      count
    }
  }
`

interface IngesterData {
  ingesterUptime: IngesterUptime
  ingesterSpans: IngesterSpan[]
  ingesterRate: IngesterRatePoint[]
  ingesterLag: IngesterLagPoint[]
  ingesterBoots: IngesterBoot[]
  ingesterConnections: IngesterConnection[]
  ingesterCauses: IngesterCause[]
}

type BootRow = IngesterBoot & { id: string }
type ConnectionRow = IngesterConnection & { id: string }

const windows = [
  { hours: 1, label: '1h' },
  { hours: 6, label: '6h' },
  { hours: 24, label: '24h' },
  { hours: 72, label: '3d' },
  { hours: 168, label: '7d' },
  { hours: 720, label: '30d' },
]

const bootColumns: Column<BootRow>[] = [
  { key: 'startedAt', label: 'Started', sortable: false, render: (boot) => new Date(boot.startedAt).toLocaleString() },
  { key: 'durationSeconds', label: 'Lifetime', sortable: false, render: (boot) => toDuration(boot.durationSeconds) },
  { key: 'connections', label: 'Connections', sortable: false, render: (boot) => boot.connections },
  { key: 'reconnects', label: 'Reconnects', sortable: false, render: (boot) => boot.reconnects },
  { key: 'events', label: 'Events', sortable: false, render: (boot) => Number(boot.events ?? 0).toLocaleString() },
  { key: 'peakLagMs', label: 'Peak Lag', sortable: false, render: (boot) => (boot.peakLagMs === null ? '-' : `${boot.peakLagMs} ms`) },
  { key: 'cleanExit', label: 'Exit', sortable: false, render: (boot) => (boot.cleanExit === null ? 'running' : boot.cleanExit ? 'clean' : 'unclean') },
]

const connectionColumns: Column<ConnectionRow>[] = [
  { key: 'spawnedAt', label: 'Spawned', sortable: false, render: (connection) => new Date(connection.spawnedAt).toLocaleString() },
  { key: 'connectSeconds', label: 'Time To First Message', sortable: false, render: (connection) => toDuration(connection.connectSeconds) },
  { key: 'durationSeconds', label: 'Held', sortable: false, render: (connection) => toDuration(connection.durationSeconds) },
  // endedAt and endedBy come from the same filter, so a cause always has a time with it
  { key: 'endedBy', label: 'Ended', sortable: false, render: (connection) => (connection.endedBy && connection.endedAt ? `${connection.endedBy} · ${new Date(connection.endedAt).toLocaleTimeString()}` : 'open') },
]

function Ingester() {
  const [hours, setHours] = useState(24)
  const [selectedBoot, setSelectedBoot] = useState<BootRow | null>(null)
  const [selectedConnection, setSelectedConnection] = useState<ConnectionRow | null>(null)

  const recordsPerPage = 10

  const { loading, error, data } = useQuery<IngesterData>(GET_INGESTER, {
    variables: { hours },
  })

  const isLoaded = useTransition(loading, data || error)

  const uptime = data?.ingesterUptime
  const spans = data?.ingesterSpans || []
  const rate = data?.ingesterRate || []
  const lag = data?.ingesterLag || []
  const causes = data?.ingesterCauses || []

  const boots: BootRow[] = (data?.ingesterBoots || []).map((boot) => ({ ...boot, id: boot.bootId }))
  const connections: ConnectionRow[] = (data?.ingesterConnections || []).map((connection) => ({ ...connection, id: connection.connectionId }))

  return (
    <>
      <div className="ing-header">
        <div className={`status-div ${isLoaded ? 'loaded' : ''}`}>
          <label htmlFor="hours-select" className="status-label">
            Window
          </label>

          <select id="hours-select" value={hours} onChange={(e) => setHours(Number(e.target.value))}>
            {windows.map((option) => (
              <option key={option.hours} value={option.hours}>
                {option.label}
              </option>
            ))}
          </select>

          <div className="select-svg-div">
            <svg width="12" height="12" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>
      </div>

      {error ? (
        <div className="positions-container loaded">
          <p className="ing-message">Unable to load ingester data, please try again</p>
        </div>
      ) : (
        <>
          <div className={`positions-container ${isLoaded ? 'loaded' : ''}`}>
            <div className="ing-uptime">
              <p className="ing-pct">{uptime?.pct?.toFixed(2) ?? '0.00'}%</p>
              <p className="ing-pct-label">streaming, excluding idle</p>
            </div>

            <IngesterTimeline spans={spans} />

            <div className="ing-legend">
              <span className="ing-legend-item">
                <span className="ing-swatch streaming" />
                Streaming {toDuration(uptime?.streamingSeconds)}
              </span>

              <span className="ing-legend-item">
                <span className="ing-swatch idle" />
                Idle {toDuration(uptime?.idleSeconds)}
              </span>

              <span className="ing-legend-item">
                <span className="ing-swatch down" />
                Down {toDuration(uptime?.downSeconds)}
              </span>
            </div>
          </div>

          <div className={`positions-container ${isLoaded ? 'loaded' : ''}`}>
            <p className="ing-card-title">Throughput</p>

            {rate.length === 0 ? <p className="ing-message">No samples in this window</p> : <IngesterRateChart points={rate} />}
          </div>

          <div className={`positions-container ${isLoaded ? 'loaded' : ''}`}>
            <div className="ing-card-header">
              <p className="ing-card-title">Lag above baseline</p>
              <p className="ing-causes">excess over the feed's baseline delay</p>
            </div>

            {lag.length === 0 ? <p className="ing-message">No samples ran late in this window</p> : <IngesterLagChart points={lag} hours={hours} />}
          </div>

          <div className={`positions-container ${isLoaded ? 'loaded' : ''}`}>
            <p className="ing-card-title">Boots</p>

            <TraceTable traceData={boots} columns={bootColumns} selectedTrace={selectedBoot} setSelectedTrace={setSelectedBoot} recordsPerPage={recordsPerPage} error={error} emptyMessage="No boots in this window" />
          </div>

          <div className={`positions-container ${isLoaded ? 'loaded' : ''}`}>
            <div className="ing-card-header">
              <p className="ing-card-title">Connections</p>

              {causes.length > 0 && (
                <p className="ing-causes">
                  {causes.map((cause) => `${cause.cause} ${cause.count}`).join(' · ')}
                </p>
              )}
            </div>

            <TraceTable traceData={connections} columns={connectionColumns} selectedTrace={selectedConnection} setSelectedTrace={setSelectedConnection} recordsPerPage={recordsPerPage} error={error} emptyMessage="No connections in this window" />
          </div>
        </>
      )}
    </>
  )
}

export default Ingester
