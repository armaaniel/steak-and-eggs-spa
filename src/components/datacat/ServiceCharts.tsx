import { useState } from 'react'
import { ComposedChart, Line, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { ms, legendText } from './runCharts'
import type { ServiceBucket } from '../../lib/types.ts'
import '../../stylesheets/datacat/loadrun.css'

interface Props {
  buckets: ServiceBucket[]
  selectedBucket: ServiceBucket | null
  onSelect: (bucket: ServiceBucket) => void
  latency?: boolean
}

interface Mark {
  t: number
  ok: number
  errors: number
  p50: number | null
  p99: number | null
  bucket: ServiceBucket
}

interface TooltipProps {
  active?: boolean
  payload?: { payload: Mark }[]
}

type Panel = 'latency' | 'requests'

const DAY_MS = 24 * 60 * 60 * 1000

const ServiceTooltip = ({ active, payload }: TooltipProps) => {
  const bucket = payload?.[0]?.payload.bucket

  if (!active || !bucket) return null

  return (
    <div className="lr-tooltip">
      <p className="lr-tooltip-time">{new Date(bucket.bucket).toLocaleString()}{bucket.partial ? ' · in progress' : ''}</p>
      <p>
        <span className="lr-key lr-key-2" />
        <strong>{ms(bucket.p99)}</strong> p99<span className="lr-dim"> · p95 {ms(bucket.p95)}</span>
      </p>
      <p>
        <span className="lr-key lr-key-1" />
        <strong>{ms(bucket.p50)}</strong> p50
      </p>
      <p><strong>{bucket.requests.toLocaleString()}</strong> requests<span className="lr-dim"> · {bucket.errors.toLocaleString()} errors</span></p>
    </div>
  )
}

const ServiceCharts = ({ buckets, selectedBucket, onSelect, latency = true }: Props) => {
  const [hovered, setHovered] = useState<Panel | null>(null)

  if (!buckets.length) return <p className="lr-message">No requests in this range.</p>

  const series: Mark[] = buckets.map((bucket) => ({
    t: new Date(bucket.bucket).getTime(),
    ok: bucket.requests - bucket.errors,
    errors: bucket.errors,
    p50: bucket.p50,
    p99: bucket.p99,
    bucket
  }))

  const span = series[series.length - 1].t - series[0].t
  const format: Intl.DateTimeFormatOptions = span > DAY_MS ? { month: 'short', day: 'numeric' } : { hour: 'numeric', minute: '2-digit' }
  const stamp = (t: number) => new Date(t).toLocaleString('en-us', format)

  const readout = (panel: Panel) => (hovered === panel ? <ServiceTooltip /> : () => null)

  const dot = (panel: Panel) => (hovered === panel ? { r: 4, strokeWidth: 0 } : false)

  const fade = (mark: Mark) => (selectedBucket && selectedBucket.bucket !== mark.bucket.bucket ? 0.35 : 1) * (mark.bucket.partial ? 0.5 : 1)

  const select = ({ activeTooltipIndex }: { activeTooltipIndex?: number | string | null }) => {
    const mark = series[Number(activeTooltipIndex)]
    if (activeTooltipIndex != null && mark) onSelect(mark.bucket)
  }

  const watch = (panel: Panel) => ({
    onPointerMove: () => setHovered((current) => (current === panel ? current : panel)),
    onPointerLeave: () => setHovered((current) => (current === panel ? null : current))
  })

  return (
    <div className="lr-panels">
      {latency && (
        <>
          <p className="lr-panel-label">Latency (ms)</p>
          <div className="lr-chart" {...watch('latency')}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={series} syncId="overview" margin={{ top: 12, right: 12, bottom: 0, left: 0 }}>
                <CartesianGrid vertical={false} stroke="var(--dc-border)" strokeDasharray="none" />
                <XAxis dataKey="t" scale="band" hide />
                <YAxis width={56} tickLine={false} axisLine={false} tick={{ fontSize: 11 }} tickFormatter={(v) => v.toLocaleString()} />
                <Tooltip content={readout('latency')} cursor={{ stroke: 'var(--dc-border-strong)', strokeWidth: 1 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} formatter={legendText} />
                <Line type="linear" dataKey="p99" name="p99" stroke="var(--dc-series-2)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" dot={false} activeDot={dot('latency')} isAnimationActive={false} />
                <Line type="linear" dataKey="p50" name="p50" stroke="var(--dc-series-1)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" dot={false} activeDot={dot('latency')} isAnimationActive={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      <p className="lr-panel-label">Requests</p>
      <div className="lr-chart lr-chart-axis" {...watch('requests')}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={series} syncId="overview" margin={{ top: 12, right: 12, bottom: 0, left: 0 }} onClick={select} style={{ cursor: 'pointer' }}>
            <CartesianGrid vertical={false} stroke="var(--dc-border)" strokeDasharray="none" />
            <XAxis dataKey="t" minTickGap={48} tickLine={false} tick={{ fontSize: 11 }} tickFormatter={stamp} />
            <YAxis width={56} allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 11 }} tickFormatter={(v) => v.toLocaleString()} />
            <Tooltip content={readout('requests')} cursor={{ fill: 'var(--dc-hover)' }} />
            <Legend wrapperStyle={{ fontSize: 12 }} formatter={legendText} />
            <Bar dataKey="ok" name="requests" stackId="requests" fill="var(--dc-series-1)" isAnimationActive={false}>
              {series.map((mark) => <Cell key={mark.t} fillOpacity={fade(mark)} />)}
            </Bar>
            <Bar dataKey="errors" name="errors" stackId="requests" fill="var(--dc-status-critical)" isAnimationActive={false}>
              {series.map((mark) => <Cell key={mark.t} fillOpacity={fade(mark)} />)}
            </Bar>
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

export default ServiceCharts
