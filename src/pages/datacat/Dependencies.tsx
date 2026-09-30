import { useOutletContext } from 'react-router-dom'
import { gql, useQuery } from '@apollo/client'
import { useState } from 'react'
import DependencyMap from '../../components/datacat/DependencyMap'
import { ms } from '../../components/datacat/runCharts'
import useTransition from '../../hooks/useTransition.ts'
import { DATACAT_RANGE_MS } from '../../hooks/useDatacatRange'
import type { DatacatRange } from '../../hooks/useDatacatRange'
import type { CanarySlo, DependencyNode, IngesterLagPoint, IngesterSpan, IngesterUptime, OutletContextType, PolygonCalls, ServiceBucket } from '../../lib/types.ts'

const GET_DEPENDENCIES = gql`
  query getDependencies($range: String!, $from: ISO8601DateTime!, $to: ISO8601DateTime!, $rangeFrom: ISO8601DateTime!) {
    canaryNow: canarySlo(range: "1h") {
      good
      expected
    }
    canarySlo(range: $range) {
      target
      good
      expected
      periodGood
      periodExpected
      budgetAllowed
      budgetUsed
    }
    serviceNow: serviceTimeseries(range: "1h") {
      requests
      errors
      p50
      p99
    }
    serviceTimeseries(range: $range) {
      requests
      errors
    }
    polygonNow: polygonCalls(range: "1h") {
      calls
      failures
    }
    polygonCalls(range: $range) {
      calls
      failures
      p50
      p99
      lastSuccessAt
    }
    ingesterUptime(from: $rangeFrom, to: $to) {
      pct
      streamingSeconds
      idleSeconds
      downSeconds
    }
    ingesterSpans(from: $from, to: $to) {
      at
      state
      seconds
    }
    ingesterLag(from: $from, to: $to) {
      at
      meanExcessMs
    }
    dependencyHealth(range: $range) {
      id
      configured
      status
      readings {
        key
        label
        unit
        now
        peak
        total
        points {
          at
          value
        }
      }
    }
  }
`

interface DependencyData {
  canaryNow: Pick<CanarySlo, 'good' | 'expected'>
  canarySlo: CanarySlo
  serviceNow: Pick<ServiceBucket, 'requests' | 'errors' | 'p50' | 'p99'>[]
  serviceTimeseries: Pick<ServiceBucket, 'requests' | 'errors'>[]
  polygonNow: Pick<PolygonCalls, 'calls' | 'failures'>
  polygonCalls: PolygonCalls
  ingesterUptime: IngesterUptime
  ingesterSpans: Pick<IngesterSpan, 'at' | 'state' | 'seconds'>[]
  ingesterLag: Pick<IngesterLagPoint, 'at' | 'meanExcessMs'>[]
  dependencyHealth: DependencyHealth[]
}

interface DependencyReading {
  key: string
  label: string
  unit: 'percent' | 'count' | 'bytes'
  now: number | null
  peak: number | null
  total: number | null
  points: { at: string; value: number }[]
}

interface DependencyHealth {
  id: string
  configured: boolean
  status: Status
  readings: DependencyReading[]
}

type Status = DependencyNode['status']

const HOUR_MS = 60 * 60 * 1000

const STATUS_LABELS: Record<Status, string> = {
  good: 'Healthy',
  warn: 'Degraded',
  critical: 'Down',
  none: 'No health signal yet',
}

const NOT_INSTRUMENTED = 'Not instrumented.'

const GB = 1024 ** 3

const RANK: Record<Status, number> = { none: 0, good: 1, warn: 2, critical: 3 }

const worst = (a: Status, b: Status) => (RANK[a] >= RANK[b] ? a : b)

const formatReading = ({ unit, now, peak, total }: DependencyReading) => {
  if (total !== null) return Math.round(total).toLocaleString()
  if (now === null) return '-'
  if (unit === 'bytes') return `${(now / GB).toFixed(1)} GB`
  if (unit === 'percent') return `${now.toFixed(1)}% now, ${(peak ?? now).toFixed(1)}% peak`
  return `${Math.round(now)} now, ${Math.round(peak ?? now)} peak`
}

const cloudwatch = (health: DependencyHealth | undefined) => {
  if (!health) return { status: 'none' as Status, metrics: [], note: 'CloudWatch data is unavailable right now.' }
  if (!health.configured) return { status: 'none' as Status, metrics: [], note: 'Not configured yet.' }

  const metrics = health.readings.map((reading) => ({
    label: reading.label,
    value: formatReading(reading),
    points: reading.points.length > 0 ? reading.points : undefined,
    color: reading.key === 'memory' ? 'var(--dc-series-2)' : 'var(--dc-series-1)',
  }))
  const note = health.status === 'none' ? 'No CloudWatch data.' : undefined

  return { status: health.status, metrics, note }
}

type NodeDraft = Omit<DependencyNode, 'range'>

const makeNode = (id: string, title: string, role: string, status: Status, rest: Partial<NodeDraft> = {}): NodeDraft => ({
  id,
  title,
  role,
  status,
  statusLabel: STATUS_LABELS[status],
  metrics: [],
  ...rest,
})

const percent = (part: number, whole: number) => (whole > 0 ? `${((part / whole) * 100).toFixed(2)}%` : '-')

const ago = (at: string, now: number) => {
  const minutes = Math.round((now - new Date(at).getTime()) / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes} min ago`
  return `${Math.floor(minutes / 60)} hr ago`
}

const total = (buckets: { requests: number; errors: number }[], key: 'requests' | 'errors') => buckets.reduce((sum, bucket) => sum + bucket[key], 0)

const buildNodes = (data: DependencyData | undefined, now: number, range: DatacatRange): DependencyNode[] => {
  const recent = data?.serviceNow ?? []
  const latest = [...recent].reverse().find((bucket) => bucket.p99 !== null)
  const railsStatus: Status = !data ? 'none' : total(recent, 'requests') === 0 ? 'critical' : total(recent, 'errors') > 0 ? 'warn' : 'good'
  const requests = total(data?.serviceTimeseries ?? [], 'requests')
  const errors = total(data?.serviceTimeseries ?? [], 'errors')

  const canaryNow = data?.canaryNow
  const canaryStatus: Status = !canaryNow || canaryNow.expected === 0 ? 'none' : canaryNow.good === canaryNow.expected ? 'good' : canaryNow.good === 0 ? 'critical' : 'warn'
  const slo = data?.canarySlo
  const budgetLeft = slo && slo.budgetAllowed > 0 ? `${(Math.max(0, 1 - slo.budgetUsed / slo.budgetAllowed) * 100).toFixed(0)}%` : '-'

  const spans = data?.ingesterSpans ?? []
  const lastSpan = spans.reduce<(typeof spans)[number] | null>((newest, span) => (!newest || span.at > newest.at ? span : newest), null)
  const state = lastSpan?.state
  const ingesterStatus: Status = !state ? 'none' : state === 'streaming' || state === 'idle' ? 'good' : 'critical'
  const lag = [...(data?.ingesterLag ?? [])].reverse().find((point) => point.meanExcessMs !== null)
  const uptime = data?.ingesterUptime
  const measured = uptime ? uptime.streamingSeconds + uptime.downSeconds : 0

  const healthFor = (id: string) => (data?.dependencyHealth ?? []).find((health) => health.id === id)
  const alb = cloudwatch(healthFor('alb'))
  const railsTask = cloudwatch(healthFor('rails'))
  const ingesterTask = cloudwatch(healthFor('ingester'))
  const postgres = cloudwatch(healthFor('postgres'))
  const redis = cloudwatch(healthFor('redis'))

  const polygonNow = data?.polygonNow
  const polygonStatus: Status = !polygonNow || polygonNow.calls === 0 ? 'none' : polygonNow.failures === polygonNow.calls ? 'critical' : polygonNow.failures > 0 ? 'warn' : 'good'
  const polygon = data?.polygonCalls

  const drafts = [
    makeNode('vercel', 'Vercel', 'Static hosting', 'none', { note: NOT_INSTRUMENTED }),
    makeNode('browser', 'Browser', 'React SPA', 'none', { note: NOT_INSTRUMENTED }),
    makeNode('mobile', 'React Native', 'Mobile app', 'none', { note: NOT_INSTRUMENTED }),
    makeNode('canary', 'Canary', 'Synthetic (k6)', canaryStatus, {
      metrics: slo
        ? [
            { label: 'Runs passed', value: `${slo.good} / ${slo.expected}` },
            { label: '30-day result', value: `${percent(slo.periodGood, slo.periodExpected)} (target ${(slo.target * 100).toFixed(1)}%)` },
            { label: '30-day error budget left', value: budgetLeft },
          ]
        : [],
    }),
    makeNode('alb', 'ALB', 'TLS termination', alb.status, { metrics: alb.metrics, note: alb.note }),
    makeNode('rails', 'Rails app', 'ECS Fargate · API + cable', worst(railsStatus, railsTask.status), {
      metrics: data
        ? [
            { label: 'Requests', value: requests.toLocaleString() },
            { label: 'Errors', value: errors.toLocaleString() },
            { label: 'p50 / p99, latest 5 min', value: latest ? `${ms(latest.p50)} / ${ms(latest.p99)}` : '-' },
            ...railsTask.metrics,
          ]
        : [],
    }),
    makeNode('redis', 'ElastiCache Redis', 'Cache + pub/sub', redis.status, { metrics: redis.metrics, note: redis.note }),
    makeNode('postgres', 'RDS Postgres', 'Persistent storage', postgres.status, { metrics: postgres.metrics, note: postgres.note }),
    makeNode('polygon', 'Polygon.io', 'Market data provider', polygonStatus, {
      metrics: polygon
        ? [
            { label: 'Last successful call', value: polygon.lastSuccessAt ? ago(polygon.lastSuccessAt, now) : 'none in the last day' },
            { label: 'Calls', value: polygon.calls.toLocaleString() },
            { label: 'Failed', value: polygon.failures.toLocaleString() },
            { label: 'p50 / p99', value: `${ms(polygon.p50)} / ${ms(polygon.p99)}` },
          ]
        : [],
    }),
    makeNode('ingester', 'Ingester', 'ECS Fargate · prices', worst(ingesterStatus, ingesterTask.status), {
      metrics: data
        ? [
            { label: 'State', value: state ?? '-' },
            { label: 'Uptime', value: !uptime ? '-' : measured === 0 ? 'idle throughout' : `${uptime.pct.toFixed(2)}% (excluding idle)` },
            { label: 'Mean lag, latest', value: ms(lag?.meanExcessMs) },
            ...ingesterTask.metrics,
          ]
        : [],
    }),
  ]

  return drafts.map((node) => ({ ...node, range }))
}

const LEGEND: Status[] = ['good', 'warn', 'critical']

function Dependencies() {
  const { detail, setDetail, range } = useOutletContext<OutletContextType>()

  const [clock, setClock] = useState(() => ({ range, at: Date.now() }))
  if (clock.range !== range) setClock({ range, at: Date.now() })

  const { loading, error, data } = useQuery<DependencyData>(GET_DEPENDENCIES, {
    variables: {
      range,
      from: new Date(clock.at - HOUR_MS).toISOString(),
      to: new Date(clock.at).toISOString(),
      rangeFrom: new Date(clock.at - DATACAT_RANGE_MS[range]).toISOString(),
    },
  })

  const isLoaded = useTransition(loading, data || error)

  const nodes = buildNodes(data, clock.at, range)
  const selectedId = detail?.kind === 'dependency' ? detail.node.id : null
  const selectNode = (node: DependencyNode) => setDetail({ kind: 'dependency', node })

  return (
    <div className={`positions-container ${isLoaded && !loading ? 'loaded' : ''}`}>
      {error && <p className="dep-message">Unable to load health data, please try again</p>}

      <DependencyMap nodes={nodes} selectedId={selectedId} onSelect={selectNode} />

      <div className="dep-legend">
        {LEGEND.map((status) => (
          <span key={status} className="dep-legend-item">
            <span className={`dep-dot ${status}`} />
            {STATUS_LABELS[status]}
          </span>
        ))}
      </div>
    </div>
  )
}

export default Dependencies
