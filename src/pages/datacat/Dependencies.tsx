import { useOutletContext } from 'react-router-dom'
import { gql, useQuery } from '@apollo/client'
import { useState } from 'react'
import DependencyMap from '../../components/datacat/DependencyMap'
import { ms } from '../../components/datacat/runCharts'
import useTransition from '../../hooks/useTransition.ts'
import type { CanarySlo, DependencyNode, IngesterLagPoint, IngesterSpan, IngesterUptime, OutletContextType, ServiceBucket, TraceSummary } from '../../lib/types.ts'

const GET_DEPENDENCIES = gql`
  query getDependencies($from: ISO8601DateTime!, $to: ISO8601DateTime!) {
    canarySlo(range: "1h") {
      target
      good
      expected
      periodGood
      periodExpected
      budgetAllowed
      budgetUsed
    }
    serviceTimeseries(range: "1h") {
      bucket
      requests
      errors
      p50
      p95
      p99
    }
    traceSummary(range: "1h") {
      route
      totalRequests
      p99
      cacheHitRate
    }
    ingesterUptime(from: $from, to: $to) {
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
  }
`

interface DependencyData {
  canarySlo: CanarySlo
  serviceTimeseries: ServiceBucket[]
  traceSummary: Pick<TraceSummary, 'route' | 'totalRequests' | 'p99' | 'cacheHitRate'>[]
  ingesterUptime: IngesterUptime
  ingesterSpans: Pick<IngesterSpan, 'at' | 'state' | 'seconds'>[]
  ingesterLag: Pick<IngesterLagPoint, 'at' | 'meanExcessMs'>[]
}

type Status = DependencyNode['status']

const HOUR_MS = 60 * 60 * 1000

const STATUS_LABELS: Record<Status, string> = {
  good: 'Healthy',
  warn: 'Degraded',
  critical: 'Down',
  idle: 'Idle (market closed)',
  none: 'No health signal yet',
}

const POLYGON_ROUTES = ['GET /stocks/symbol/marketdata', 'GET /stocks/symbol/chartdata', 'GET /stocks/symbol/companydata']

const NOT_COLLECTED = 'Server health metrics are not collected yet.'

const NOT_INSTRUMENTED = 'Not instrumented.'

const makeNode = (id: string, title: string, role: string, status: Status, rest: Partial<DependencyNode> = {}): DependencyNode => ({
  id,
  title,
  role,
  status,
  statusLabel: STATUS_LABELS[status],
  metrics: [],
  ...rest,
})

const percent = (part: number, whole: number) => (whole > 0 ? `${((part / whole) * 100).toFixed(2)}%` : '-')

const buildNodes = (data: DependencyData | undefined): DependencyNode[] => {
  const buckets = data?.serviceTimeseries ?? []
  const requests = buckets.reduce((sum, bucket) => sum + bucket.requests, 0)
  const errors = buckets.reduce((sum, bucket) => sum + bucket.errors, 0)
  const latest = [...buckets].reverse().find((bucket) => bucket.p99 !== null)
  const railsStatus: Status = !data ? 'none' : requests === 0 ? 'critical' : errors > 0 ? 'warn' : 'good'

  const slo = data?.canarySlo
  const canaryStatus: Status = !slo || slo.expected === 0 ? 'none' : slo.good === slo.expected ? 'good' : slo.good === 0 ? 'critical' : 'warn'
  const budgetLeft = slo && slo.budgetAllowed > 0 ? `${(Math.max(0, 1 - slo.budgetUsed / slo.budgetAllowed) * 100).toFixed(0)}%` : '-'

  const spans = data?.ingesterSpans ?? []
  const lastSpan = spans.reduce<(typeof spans)[number] | null>((newest, span) => (!newest || span.at > newest.at ? span : newest), null)
  const state = lastSpan?.state
  const ingesterStatus: Status = !state ? 'none' : state === 'streaming' ? 'good' : state === 'idle' ? 'idle' : 'critical'
  const lag = [...(data?.ingesterLag ?? [])].reverse().find((point) => point.meanExcessMs !== null)
  const uptime = data?.ingesterUptime
  const measured = uptime ? uptime.streamingSeconds + uptime.downSeconds : 0

  const summary = data?.traceSummary ?? []
  const polygonRows = POLYGON_ROUTES.flatMap((route) => summary.filter((row) => row.route === route))
  const cachedRows = summary
    .filter((row) => row.cacheHitRate !== null && row.cacheHitRate > 0)
    .sort((a, b) => b.totalRequests - a.totalRequests)
    .slice(0, 4)

  return [
    makeNode('vercel', 'Vercel', 'Static hosting', 'none', { note: NOT_INSTRUMENTED }),
    makeNode('browser', 'Browser', 'React SPA', 'none', { note: NOT_INSTRUMENTED }),
    makeNode('mobile', 'React Native', 'Mobile app', 'none', { note: NOT_INSTRUMENTED }),
    makeNode('canary', 'Canary', 'Synthetic (k6)', canaryStatus, {
      metrics: slo
        ? [
            { label: 'Runs passed, last hour', value: `${slo.good} / ${slo.expected}` },
            { label: '30-day result', value: `${percent(slo.periodGood, slo.periodExpected)} (target ${(slo.target * 100).toFixed(1)}%)` },
            { label: 'Error budget left', value: budgetLeft },
          ]
        : [],
      link: { to: '/datacat/uptime', label: 'Open Uptime' },
    }),
    makeNode('alb', 'ALB', 'TLS termination', 'none', { note: NOT_COLLECTED }),
    makeNode('rails', 'Rails app', 'ECS Fargate · API + cable', railsStatus, {
      metrics: data
        ? [
            { label: 'Requests, last hour', value: requests.toLocaleString() },
            { label: 'Errors, last hour', value: errors.toLocaleString() },
            { label: 'p50 / p99, latest 5 min', value: latest ? `${ms(latest.p50)} / ${ms(latest.p99)}` : '-' },
          ]
        : [],
      link: { to: '/datacat', label: 'Open Overview' },
    }),
    makeNode('redis', 'ElastiCache Redis', 'Cache + pub/sub', 'none', {
      metrics: cachedRows.map((row) => ({ label: `${row.route} hit rate`, value: `${row.cacheHitRate}%` })),
      note: `Hit rates come from traces, for routes that use the cache. ${NOT_COLLECTED}`,
    }),
    makeNode('postgres', 'RDS Postgres', 'Persistent storage', 'none', { note: NOT_COLLECTED }),
    makeNode('polygon', 'Polygon.io', 'Market data provider', 'none', {
      metrics: [
        ...polygonRows.map((row) => ({ label: `${row.route} p99, last hour`, value: ms(row.p99) })),
        ...(state ? [{ label: 'Price feed', value: `ingester ${state}` }] : []),
      ],
      note: 'No direct health check yet; these are the routes and the feed that depend on it.',
    }),
    makeNode('ingester', 'Ingester', 'ECS Fargate · prices', ingesterStatus, {
      metrics: data
        ? [
            { label: 'State', value: state ?? '-' },
            { label: 'Uptime, last hour', value: !uptime ? '-' : measured === 0 ? 'idle all hour' : `${uptime.pct.toFixed(2)}% (excluding idle)` },
            { label: 'Mean lag, latest', value: ms(lag?.meanExcessMs) },
          ]
        : [],
      link: { to: '/datacat/ingester', label: 'Open Ingester' },
    }),
  ]
}

const LEGEND: Status[] = ['good', 'warn', 'critical', 'idle', 'none']

function Dependencies() {
  const { detail, setDetail } = useOutletContext<OutletContextType>()

  const [lastHour] = useState(() => {
    const to = Date.now()
    return { from: new Date(to - HOUR_MS).toISOString(), to: new Date(to).toISOString() }
  })

  const { loading, error, data } = useQuery<DependencyData>(GET_DEPENDENCIES, {
    variables: lastHour,
  })

  const isLoaded = useTransition(loading, data || error)

  const nodes = buildNodes(data)
  const selectedId = detail?.kind === 'dependency' ? detail.node.id : null
  const selectNode = (node: DependencyNode) => setDetail({ kind: 'dependency', node })

  return (
    <div className={`positions-container ${isLoaded ? 'loaded' : ''}`}>
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
