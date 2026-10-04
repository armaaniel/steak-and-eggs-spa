import { useCallback, useState, type MouseEvent } from 'react'
import { scaleLinear } from 'd3-scale'
import { line } from 'd3-shape'
import { HEIGHT, MARGIN, PLOT_BOTTOM, bucketAt, timeScale, toMarks, type Hover, type Mark } from './bucketChart'
import type { ServiceBucket } from '../../lib/types.ts'
import '../../stylesheets/datacat/loadrun.css'
import '../../stylesheets/datacat/charts.css'

interface Props {
  buckets: ServiceBucket[]
  hover: Hover | null
  onHover: (hover: Hover | null) => void
}

type Percentile = 'p50' | 'p99'

const Y_TICKS = 5

// One hue, darker for slower (brighter in dark mode); p99 first so p50 draws over it.
const PERCENTILES: { key: Percentile; color: string }[] = [
  { key: 'p99', color: 'var(--dc-latency-p99)' },
  { key: 'p50', color: 'var(--dc-latency-p50)' }
]

// "0", "250ms", "1.5s"
const axisDuration = (v: number) => (v === 0 ? '0' : v >= 1000 ? `${+(v / 1000).toFixed(2)}s` : `${+v.toFixed(2)}ms`)

const readoutDuration = (v: number | null) => (v === null ? '–' : v >= 1000 ? `${(v / 1000).toFixed(2)} s` : `${v.toLocaleString('en-us', { maximumFractionDigits: 1 })} ms`)

const pad2 = (n: number) => String(n).padStart(2, '0')

// Each tick names the largest unit that changes there: "06:00", "Sat 26", "Sep 27" on Sundays, "October".
const timeLabel = (date: Date) => {
  if (date.getHours() || date.getMinutes()) return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`
  if (date.getDate() !== 1) return date.getDay() === 0 ? date.toLocaleDateString('en-us', { month: 'short', day: 'numeric' }) : `${date.toLocaleDateString('en-us', { weekday: 'short' })} ${date.getDate()}`
  if (date.getMonth() !== 0) return date.toLocaleDateString('en-us', { month: 'long' })
  return String(date.getFullYear())
}

const LatencyChart = ({ buckets, hover, onHover }: Props) => {
  const [width, setWidth] = useState(0)
  const [pointerY, setPointerY] = useState(0)
  const [hidden, setHidden] = useState<Percentile[]>([])

  // A ref callback, so it starts measuring whenever the chart mounts, even if it first rendered with no buckets.
  const measure = useCallback((el: HTMLDivElement | null) => {
    if (!el) return
    const observer = new ResizeObserver(([entry]) => setWidth(Math.floor(entry.contentRect.width)))
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const series = toMarks(buckets)
  if (!series.length) return null

  const x = timeScale(series, width)

  // The y axis fits the lines that are showing, so hiding p99 zooms in on p50.
  const percentiles = PERCENTILES.filter(({ key }) => !hidden.includes(key))
  const slowest = series.reduce((max, mark) => Math.max(max, ...percentiles.map(({ key }) => mark[key] ?? 0)), 0)
  const y = scaleLinear()
    .domain([0, slowest || 1])
    .nice(Y_TICKS)
    .range([PLOT_BOTTOM, MARGIN.top])

  // Labels that would run off either edge are dropped rather than clipped.
  const timeTicks = x
    .ticks(Math.max(2, Math.floor((width - MARGIN.left - MARGIN.right) / 100)))
    .map((date) => ({ pos: x(date), label: timeLabel(date) }))
    .filter(({ pos, label }) => pos - label.length * 3.3 >= 0 && pos + label.length * 3.3 <= width)

  // Nulls leave gaps rather than joining across buckets with no requests.
  const path = (key: Percentile) =>
    line<Mark>()
      .defined((mark) => mark[key] !== null)
      .x((mark) => x(mark.mid))
      .y((mark) => y(mark[key] ?? 0))(series) ?? undefined

  // Tells the page only when the hovered bucket changes, so moving within a bucket re-renders just this chart.
  const track = (e: MouseEvent<SVGSVGElement>) => {
    setPointerY(e.clientY - e.currentTarget.getBoundingClientRect().top)
    const index = bucketAt(e, series, x)
    if (index === null) {
      if (hover?.chart === 'latency') onHover(null)
    } else if (hover?.chart !== 'latency' || hover.index !== index) {
      onHover({ chart: 'latency', index })
    }
  }

  const leave = () => {
    if (hover?.chart === 'latency') onHover(null)
  }

  const toggle = (key: Percentile) => setHidden((current) => (current.includes(key) ? current.filter((k) => k !== key) : [...current, key]))

  // The range can change under a hovered bucket. The crosshair shows for a hover on either chart;
  // the dots and readout only while this chart is hovered.
  const active = hover && series[hover.index] ? series[hover.index] : null
  const focused = active !== null && hover?.chart === 'latency'
  const activeX = active ? x(active.mid) : 0

  // slowest first, like the lines from top to bottom
  const rows = active
    ? percentiles
        .map(({ key, color }) => ({ key, color, value: active[key] }))
        .sort((a, b) => (b.value ?? -1) - (a.value ?? -1))
    : []

  return (
    <>
      <p className="lr-panel-label">Latency</p>
      <div ref={measure} className="dc-chart">
        <svg width={width} height={HEIGHT} onPointerMove={track} onPointerLeave={leave}>
          {y.ticks(Y_TICKS).map((tick) => (
            <g key={tick}>
              <line className="dc-grid" x1={MARGIN.left} x2={width - MARGIN.right} y1={y(tick)} y2={y(tick)} />
              <text x={MARGIN.left - 8} y={y(tick)} dy="0.32em" textAnchor="end">{axisDuration(tick)}</text>
            </g>
          ))}

          {timeTicks.map(({ pos, label }) => (
            <text key={pos} x={pos} y={PLOT_BOTTOM + 15} textAnchor="middle">{label}</text>
          ))}

          {active && <line x1={activeX} x2={activeX} y1={MARGIN.top} y2={PLOT_BOTTOM} stroke="var(--dc-border-strong)" />}

          {percentiles.map(({ key, color }) => (
            <path key={key} d={path(key)} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
          ))}

          {focused && percentiles.map(({ key, color }) => active[key] !== null && <circle key={key} cx={activeX} cy={y(active[key] ?? 0)} r={3.5} fill={color} stroke="var(--dc-surface)" strokeWidth={2} />)}
        </svg>

        {/* flips toward the middle of the chart so it stays inside */}
        {focused && rows.length > 0 && (
          <div className="dc-readout" style={{ left: activeX, top: pointerY, transform: `translate(${activeX > width / 2 ? 'calc(-100% - 12px)' : '12px'}, ${pointerY > HEIGHT / 2 ? 'calc(-100% - 8px)' : '8px'})` }}>
            <p className="dc-readout-time">{new Date(active.start).toLocaleString('en-us', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</p>
            {rows.map(({ key, color, value }) => (
              <p key={key} className="dc-readout-row">
                <span className="dc-swatch" style={{ backgroundColor: color }} />
                <span>{key}</span>
                <strong>{readoutDuration(value)}</strong>
              </p>
            ))}
          </div>
        )}
      </div>

      <div className="dc-legend">
        {PERCENTILES.map(({ key, color }) => (
          <button key={key} type="button" className={hidden.includes(key) ? 'off' : ''} aria-pressed={!hidden.includes(key)} onClick={() => toggle(key)}>
            <span className="dc-swatch" style={{ backgroundColor: color }} />
            {key}
          </button>
        ))}
      </div>
    </>
  )
}

export default LatencyChart
