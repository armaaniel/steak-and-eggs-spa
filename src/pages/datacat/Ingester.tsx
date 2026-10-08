import { useOutletContext } from 'react-router-dom'
import { gql, useQuery } from '@apollo/client'
import { useState } from 'react'
import { curveLinear } from 'd3-shape'
import TraceTable from '../../components/datacat/TraceTable'
import IngesterTimeline from '../../components/datacat/IngesterTimeline'
import TimeSeriesChart, { type ChartLine } from '../../components/datacat/TimeSeriesChart'
import DateRangePicker from '../../components/datacat/DateRangePicker'
import useTransition from '../../hooks/useTransition.ts'
import { findNearestPoint } from '../../components/datacat/timeSeries'
import { HEIGHT, Y_LABEL_GAP } from '../../components/datacat/bucketChart'
import { toDuration, toRange } from '../../lib/utils.ts'
import '../../stylesheets/datacat/ingester.css'
import type { Column, IngesterUptime, IngesterSpan, IngesterRatePoint, IngesterLagPoint, IngesterTransition, IngesterBoot, IngesterConnection, OutletContextType, DateRange, ResourcePoint } from '../../lib/types.ts'

const GET_INGESTER = gql`
  query getIngester($from: ISO8601DateTime!, $to: ISO8601DateTime!) {
    ingesterUptime(from: $from, to: $to) {
      pct
      streamingSeconds
      idleSeconds
      downSeconds
    }
    ingesterSpans(from: $from, to: $to) {
      at
      bootId
      connectionId
      state
      seconds
    }
    ingesterRate(from: $from, to: $to) {
      at
      eventsPerSec
      framesPerSec
      meanExcessMs
      meanProcessMs
      meanIdleMs
      symbols
    }
    ingesterTransitions(from: $from, to: $to) {
      id
      at
      bootId
      connectionId
      state
      cause
      detail
    }
    ingesterLag(from: $from, to: $to) {
      at
      meanExcessMs
      sampledEvents
      symbols
    }
    ingesterResources(from: $from, to: $to) {
      at
      cpu
      memory
    }
    ingesterBoots(from: $from, to: $to) {
      bootId
      startedAt
      lastSeenAt
      durationSeconds
      connections
      reconnects
      exitState
    }
    ingesterConnections(from: $from, to: $to) {
      connectionId
      bootId
      spawnedAt
      firstMessageAt
      lastMessageAt
      lastSeenAt
      state
      endedAt
      endedBy
      durationSeconds
      events
      p99MeanExcessMs
    }
  }
`

interface IngesterData {
  ingesterUptime: IngesterUptime
  ingesterSpans: IngesterSpan[]
  ingesterRate: IngesterRatePoint[]
  ingesterTransitions: IngesterTransition[]
  ingesterLag: IngesterLagPoint[]
  ingesterResources: ResourcePoint[]
  ingesterBoots: IngesterBoot[]
  ingesterConnections: IngesterConnection[]
}

type BootRow = IngesterBoot & { id: string }

const RESOURCES_DRAWER_HEIGHT = HEIGHT + 40

function toTime(at: string) {
  return new Date(at).getTime()
}

function formatRate(value: number) {
  return `${value.toFixed(1)}/s`
}

function formatLag(value: number) {
  return `${Math.round(value).toLocaleString()} ms`
}

function formatPercent(value: number) {
  return `${value.toFixed(1)}%`
}

function formatFrameMs(value: number | null) {
  if (value === null) {
    return '-'
  }

  return `${value.toFixed(2)} ms`
}

function toRateLines(rate: IngesterRatePoint[]): ChartLine[] {
  return [
    { key: 'events', label: 'events/sec', color: 'var(--dc-latency-p99)', points: rate.map((point) => ({ time: toTime(point.at), value: point.eventsPerSec })) },
    { key: 'frames', label: 'frames/sec', color: 'var(--dc-latency-p50)', points: rate.map((point) => ({ time: toTime(point.at), value: point.framesPerSec })) },
  ]
}

function toLagLines(lag: IngesterLagPoint[]): ChartLine[] {
  return [{ key: 'lag', label: 'mean lag', color: 'var(--dc-latency-p99)', points: lag.map((point) => ({ time: toTime(point.at), value: point.meanExcessMs })) }]
}

function toResourceLines(resources: ResourcePoint[]): ChartLine[] {
  return [
    { key: 'cpu', label: 'CPU', color: 'var(--dc-latency-p99)', points: resources.map((point) => ({ time: toTime(point.at), value: point.cpu })) },
    { key: 'memory', label: 'Memory', color: 'var(--dc-latency-p50)', points: resources.map((point) => ({ time: toTime(point.at), value: point.memory })) },
  ]
}

function describeRate(point: IngesterRatePoint) {
  return `${formatFrameMs(point.meanProcessMs)} process · ${formatFrameMs(point.meanIdleMs)} idle · ${point.symbols ?? '-'} symbols`
}

function describeLag(point: IngesterLagPoint) {
  return `${point.sampledEvents?.toLocaleString() ?? '-'} events · ${point.symbols ?? '-'} symbols`
}

type ConnectionRow = IngesterConnection & { id: string }

const toIso = (ms: number) => (Number.isFinite(ms) ? new Date(ms).toISOString() : '')

const bootColumns: Column<BootRow>[] = [
  { key: 'startedAt', label: 'Started', sortable: false, render: (boot) => new Date(boot.startedAt).toLocaleString() },
  { key: 'durationSeconds', label: 'Lifetime', sortable: false, render: (boot) => toDuration(boot.durationSeconds) },
  { key: 'connections', label: 'Connections', sortable: false, render: (boot) => boot.connections },
  { key: 'reconnects', label: 'Reconnects', sortable: false, render: (boot) => boot.reconnects },
  { key: 'exitState', label: 'Exit', sortable: false, render: (boot) => (boot.exitState === 'none' ? 'no sigterm' : boot.exitState) },
]

const connectionColumns: Column<ConnectionRow>[] = [
  { key: 'spawnedAt', label: 'Started', sortable: false, render: (connection) => new Date(connection.spawnedAt).toLocaleString() },
  { key: 'durationSeconds', label: 'Lifetime', sortable: false, render: (connection) => toDuration(connection.durationSeconds) },
  { key: 'firstMessageAt', label: 'First Message', sortable: false, render: (connection) => (connection.firstMessageAt ? new Date(connection.firstMessageAt).toLocaleString() : 'none') },
  { key: 'events', label: 'Events', sortable: false, render: (connection) => Number(connection.events ?? 0).toLocaleString() },
  { key: 'p99MeanExcessMs', label: 'p99 Mean Lag', sortable: false, render: (connection) => (connection.p99MeanExcessMs === null ? '-' : `${connection.p99MeanExcessMs.toLocaleString()} ms`) },
  { key: 'endedBy', label: 'Exit', sortable: false, render: (connection) => (connection.endedAt ? `${connection.endedBy} · ${new Date(connection.endedAt).toLocaleTimeString()}` : connection.endedBy) },
]

function Ingester() {
  const { detail, setDetail } = useOutletContext<OutletContextType>()

  const [preset, setPreset] = useState<number | 'custom'>(24)
  const [range, setRange] = useState<DateRange>(() => toRange(24))

  const applyWindow = (nextPreset: number | 'custom', nextRange: DateRange) => {
    setDetail(null)
    setPreset(nextPreset)
    setRange(nextRange)
  }

  const recordsPerPage = 10

  const { loading, error, data } = useQuery<IngesterData>(GET_INGESTER, {
    variables: { from: toIso(range.from), to: toIso(range.to) },
  })

  const isLoaded = useTransition(loading, data || error)

  const uptime = data?.ingesterUptime
  const spans = data?.ingesterSpans || []
  const rate = data?.ingesterRate || []
  const lag = data?.ingesterLag || []
  const resources = data?.ingesterResources || []
  const transitions = data?.ingesterTransitions || []

  const [hoveredTime, setHoveredTime] = useState<number | null>(null)
  const [showResources, setShowResources] = useState(false)
  const [rateYLabelWidth, setRateYLabelWidth] = useState(0)
  const [lagYLabelWidth, setLagYLabelWidth] = useState(0)
  const [resourcesYLabelWidth, setResourcesYLabelWidth] = useState(0)
  const chartLeft = Math.max(rateYLabelWidth, lagYLabelWidth, resourcesYLabelWidth) + Y_LABEL_GAP

  const rateMarks = rate.map((point) => ({ time: toTime(point.at), point }))
  const lagMarks = lag.map((point) => ({ time: toTime(point.at), point }))
  const hoveredRate = hoveredTime === null ? null : findNearestPoint(rateMarks, hoveredTime)
  const hoveredLag = hoveredTime === null ? null : findNearestPoint(lagMarks, hoveredTime)

  const boots: BootRow[] = (data?.ingesterBoots || []).map((boot) => ({ ...boot, id: boot.bootId }))
  const connections: ConnectionRow[] = (data?.ingesterConnections || []).map((connection) => ({ ...connection, id: connection.connectionId }))

  const selectBoot = (boot: BootRow) =>
    setDetail({
      kind: 'boot',
      boot,
      transitions: transitions.filter((transition) => transition.bootId === boot.bootId),
      connections: connections.filter((connection) => connection.bootId === boot.bootId),
    })

  const selectConnection = (connection: ConnectionRow) =>
    setDetail({
      kind: 'connection',
      connection,
      transitions: transitions.filter((transition) => transition.connectionId === connection.connectionId),
    })

  const selectedBoot = detail?.kind === 'boot' ? boots.find((boot) => boot.bootId === detail.boot.bootId) || null : null
  const selectedConnection = detail?.kind === 'connection' ? connections.find((row) => row.connectionId === detail.connection.connectionId) || null : null

  return (
    <>
      <div className="ing-header">
        <DateRangePicker preset={preset} range={range} loaded={isLoaded} onApply={applyWindow} />
      </div>

      {error ? (
        <div className="positions-container loaded">
          <p className="ing-message">Unable to load ingester data, please try again</p>
        </div>
      ) : (
        <>
          <div className={`positions-container ${isLoaded && !loading ? 'loaded' : ''}`}>
            <div className="ing-uptime">
              <p className="ing-pct">{uptime?.pct?.toFixed(2) ?? '0.00'}%</p>
              <p className="ing-pct-label">streaming, excluding idle</p>

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

            <IngesterTimeline spans={spans} from={range.from} to={range.to} chartLeft={chartLeft} hoveredTime={hoveredTime} setHoveredTime={setHoveredTime} />
          </div>

          <div className={`positions-container ${isLoaded && !loading ? 'loaded' : ''}`}>
            <div className="lr-panels">
              <TimeSeriesChart
                title="Throughput"
                tooltip
                lines={toRateLines(rate)}
                from={range.from}
                to={range.to}
                yAxis="auto"
                formatValue={formatRate}
                hoveredTime={hoveredTime}
                setHoveredTime={setHoveredTime}
                showTimeLabels={lag.length === 0}
                showHoverTime={rate.length > 0}
                hoverDetail={hoveredRate ? describeRate(hoveredRate.point) : undefined}
                chartLeft={chartLeft}
                height={HEIGHT}
                setYLabelWidth={setRateYLabelWidth}
                note={rate.length === 0 ? 'No samples in this window' : undefined}
              />
            </div>

            <div className="lr-panels">
              <TimeSeriesChart
                title="Mean lag (ms)"
                lines={toLagLines(lag)}
                from={range.from}
                to={range.to}
                yAxis="auto"
                formatValue={formatLag}
                hoveredTime={hoveredTime}
                setHoveredTime={setHoveredTime}
                showTimeLabels
                showHoverTime={rate.length === 0}
                hoverDetail={hoveredLag ? describeLag(hoveredLag.point) : undefined}
                zeroLine
                chartLeft={chartLeft}
                height={HEIGHT}
                setYLabelWidth={setLagYLabelWidth}
                note={lag.length === 0 ? 'No samples in this window' : undefined}
              />
            </div>

            <div>
              <button type="button" className="ing-panel-toggle" onClick={() => setShowResources(!showResources)} aria-expanded={showResources}>
                CPU and memory
                <svg width="12" height="12" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg" className={`stats-v ${showResources ? 'open' : ''}`}>
                  <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>

              <div className={`ing-drawer ${showResources ? 'open' : ''}`} style={{ maxHeight: showResources ? RESOURCES_DRAWER_HEIGHT : 0 }} inert={!showResources}>
                <div className="lr-panels">
                  <TimeSeriesChart
                    title=""
                    lines={toResourceLines(resources)}
                    from={range.from}
                    to={range.to}
                    yAxis="percent"
                    curve={curveLinear}
                    formatValue={formatPercent}
                    hoveredTime={hoveredTime}
                    setHoveredTime={setHoveredTime}
                    showTimeLabels
                    showHoverTime={false}
                    chartLeft={chartLeft}
                    height={HEIGHT}
                    setYLabelWidth={setResourcesYLabelWidth}
                    note={resources.length === 0 ? 'No CloudWatch data in this window' : undefined}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className={`positions-container ${isLoaded && !loading ? 'loaded' : ''}`}>
            <p className="ing-card-title">Boots</p>

            <TraceTable traceData={boots} columns={bootColumns} selectedTrace={selectedBoot} setSelectedTrace={selectBoot} recordsPerPage={recordsPerPage} error={error} emptyMessage="No boots in this window" />
          </div>

          <div className={`positions-container ${isLoaded && !loading ? 'loaded' : ''}`}>
            <p className="ing-card-title">Connections</p>

            <TraceTable traceData={connections} columns={connectionColumns} selectedTrace={selectedConnection} setSelectedTrace={selectConnection} recordsPerPage={recordsPerPage} error={error} emptyMessage="No connections in this window" />
          </div>

        </>
      )}
    </>
  )
}

export default Ingester
