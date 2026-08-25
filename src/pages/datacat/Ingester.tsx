import { useOutletContext } from 'react-router-dom'
import { gql, useQuery } from '@apollo/client'
import { useState } from 'react'
import TraceTable from '../../components/datacat/TraceTable'
import IngesterTimeline from '../../components/datacat/IngesterTimeline'
import IngesterRateChart from '../../components/datacat/IngesterRateChart'
import IngesterLagChart from '../../components/datacat/IngesterLagChart'
import useTransition from '../../hooks/useTransition.ts'
import { toDuration } from '../../lib/utils.ts'
import '../../stylesheets/datacat/ingester.css'
import type { Column, IngesterUptime, IngesterSpan, IngesterRatePoint, IngesterLagPoint, IngesterTransition, IngesterBoot, IngesterConnection, IngesterCause, OutletContextType } from '../../lib/types.ts'

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
    ingesterTransitions(hours: $hours) {
      id
      at
      bootId
      connectionId
      state
      cause
      detail
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
      exitState
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
  ingesterTransitions: IngesterTransition[]
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
  // the server decides the state; 'none' is the only value that reads better spelled out
  { key: 'exitState', label: 'Exit', sortable: false, render: (boot) => (boot.exitState === 'none' ? 'no sigterm' : boot.exitState) },
]

const connectionColumns: Column<ConnectionRow>[] = [
  { key: 'spawnedAt', label: 'Started', sortable: false, render: (connection) => new Date(connection.spawnedAt).toLocaleString() },
  // the timestamp rather than the delta from spawn: a connection opened outside market hours
  // waits on the first trade, not on the socket, and a duration there reads as latency it isn't
  { key: 'firstMessageAt', label: 'First Message', sortable: false, render: (connection) => (connection.firstMessageAt ? new Date(connection.firstMessageAt).toLocaleString() : 'none') },
  { key: 'durationSeconds', label: 'Held', sortable: false, render: (connection) => toDuration(connection.durationSeconds) },
  // endedBy is now always present ('open' / 'no record' / the cause); only a real terminal
  // cause carries a timestamp with it
  { key: 'endedBy', label: 'Ended', sortable: false, render: (connection) => (connection.endedAt ? `${connection.endedBy} · ${new Date(connection.endedAt).toLocaleTimeString()}` : connection.endedBy) },
]

function Ingester() {
  const { selectedIngesterDetail, setSelectedIngesterDetail } = useOutletContext<OutletContextType>()

  const [hours, setHours] = useState(24)

  const changeHours = (value: number) => {
    setSelectedIngesterDetail(null) // the selected row may not exist in the new window
    setHours(value)
  }

  const recordsPerPage = 10

  const { loading, error, data } = useQuery<IngesterData>(GET_INGESTER, {
    variables: { hours },
  })

  const isLoaded = useTransition(loading, data || error)

  const uptime = data?.ingesterUptime
  const spans = data?.ingesterSpans || []
  const rate = data?.ingesterRate || []
  const lag = data?.ingesterLag || []
  const transitions = data?.ingesterTransitions || []
  const causes = data?.ingesterCauses || []

  const boots: BootRow[] = (data?.ingesterBoots || []).map((boot) => ({ ...boot, id: boot.bootId }))
  const connections: ConnectionRow[] = (data?.ingesterConnections || []).map((connection) => ({ ...connection, id: connection.connectionId }))

  // the page already holds every transition and connection, and both carry bootId — so the
  // drill-down is a filter over data in hand rather than another round trip
  const selectBoot = (boot: BootRow) =>
    setSelectedIngesterDetail({
      kind: 'boot',
      boot,
      transitions: transitions.filter((transition) => transition.bootId === boot.bootId),
      connections: connections.filter((connection) => connection.bootId === boot.bootId),
    })

  const selectConnection = (connection: ConnectionRow) =>
    setSelectedIngesterDetail({
      kind: 'connection',
      connection,
      transitions: transitions.filter((transition) => transition.connectionId === connection.connectionId),
    })

  const selectedBoot = selectedIngesterDetail?.kind === 'boot' ? boots.find((boot) => boot.bootId === selectedIngesterDetail.boot.bootId) || null : null
  const selectedConnection = selectedIngesterDetail?.kind === 'connection' ? connections.find((row) => row.connectionId === selectedIngesterDetail.connection.connectionId) || null : null

  return (
    <>
      <div className="ing-header">
        <div className={`status-div ${isLoaded ? 'loaded' : ''}`}>
          <label htmlFor="hours-select" className="status-label">
            Window
          </label>

          <select id="hours-select" value={hours} onChange={(e) => changeHours(Number(e.target.value))}>
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

            <TraceTable traceData={boots} columns={bootColumns} selectedTrace={selectedBoot} setSelectedTrace={selectBoot} recordsPerPage={recordsPerPage} error={error} emptyMessage="No boots in this window" />
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

            <TraceTable traceData={connections} columns={connectionColumns} selectedTrace={selectedConnection} setSelectedTrace={selectConnection} recordsPerPage={recordsPerPage} error={error} emptyMessage="No connections in this window" />
          </div>

        </>
      )}
    </>
  )
}

export default Ingester
