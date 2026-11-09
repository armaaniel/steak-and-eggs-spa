import { useMemo, useState, type MouseEvent } from 'react'
import type { Span, SpanCategory, Trace } from '../../lib/types.ts'
import '../../stylesheets/datacat/waterfall.css'

interface Props {
  trace: Trace
}

interface Node {
  key: string
  span: Span
  label: string
  children: Node[]
}

interface Tip {
  text: string
  x: number
  y: number
}

const CATEGORIES: { key: SpanCategory, label: string, field: keyof Trace }[] = [
  { key: 'app', label: 'App code', field: 'appMs' },
  { key: 'sql', label: 'SQL', field: 'sqlMs' },
  { key: 'redis', label: 'Redis', field: 'redisMs' },
  { key: 'http', label: 'HTTP', field: 'httpMs' },
  { key: 'callbacks', label: 'Callbacks', field: 'callbacksMs' },
  { key: 'render', label: 'Render', field: 'renderMs' },
]

const PREFIX: Partial<Record<SpanCategory, string>> = { sql: 'SQL', redis: 'Redis', http: 'HTTP' }

function formatMs(ms: number) {
  const digits = ms < 1 ? 2 : 1
  return `${ms.toLocaleString('en-us', { minimumFractionDigits: digits, maximumFractionDigits: digits })} ms`
}

function describe(span: Span) {
  const parts: string[] = []

  if (span.hit !== null && span.hit !== undefined) parts.push(span.hit ? 'hit' : 'miss')
  if (span.cached) parts.push('answered by the query cache')
  if (span.dropped) parts.push(`${span.dropped.toLocaleString('en-us')} more spans weren't stored`)

  return parts.join(' · ')
}

function groupKey(span: Span) {
  return span.category === 'redis' ? span.name.split(' ')[0] : span.name
}

function groupRuns(node: Node): Node {
  const children: Node[] = []
  let run: Node[] = []

  const flush = () => {
    if (run.length >= 3) {
      const first = run[0].span
      const last = run[run.length - 1].span

      children.push({
        key: `${run[0].key}-group`,
        label: `${groupKey(first)} × ${run.length}`,
        span: { ...first, duration: last.start + last.duration - first.start, sql: null, cached: null, hit: null, dropped: null },
        children: run,
      })
    } else {
      children.push(...run)
    }

    run = []
  }

  node.children.map(groupRuns).forEach((child) => {
    const leaf = child.children.length === 0
    const joins = run.length > 0 && leaf && run[0].children.length === 0 && child.span.category === run[0].span.category && groupKey(child.span) === groupKey(run[0].span)

    if (!joins) flush()
    run.push(child)
  })

  flush()

  return { ...node, children }
}

function buildTree(spans: Span[]) {
  const nodes: Node[] = spans.map((span, index) => ({ key: String(index), span, label: span.name, children: [] }))
  const roots: Node[] = []

  nodes.forEach((node) => {
    const parent = node.span.parent === null ? undefined : nodes[node.span.parent]

    if (parent) parent.children.push(node)
    else roots.push(node)
  })

  nodes.forEach((node) => node.children.sort((a, b) => a.span.start - b.span.start))

  return roots.map(groupRuns)
}

function collapsedByDefault(nodes: Node[], keys = new Set<string>()) {
  nodes.forEach((node) => {
    if (node.children.length >= 3 && node.children.every((child) => child.children.length === 0)) keys.add(node.key)
    collapsedByDefault(node.children, keys)
  })

  return keys
}

function ownTime(node: Node) {
  return node.span.duration - node.children.reduce((sum, child) => sum + child.span.duration, 0)
}

const TraceWaterfall = ({ trace }: Props) => {
  const total = trace.duration
  const tree = useMemo(() => buildTree(trace.spans ?? []), [trace.spans])
  const [collapsed, setCollapsed] = useState(() => collapsedByDefault(tree))
  const [tip, setTip] = useState<Tip | null>(null)

  const parts = CATEGORIES
    .map((category) => ({ ...category, ms: Number(trace[category.field] ?? 0) }))
    .filter((part) => part.ms > 0)

  const rows: { node: Node, depth: number }[] = []
  const visit = (nodes: Node[], depth: number) => {
    nodes.forEach((node) => {
      rows.push({ node, depth })
      if (!collapsed.has(node.key)) visit(node.children, depth + 1)
    })
  }
  visit(tree, 0)

  const toggle = (key: string) => {
    setCollapsed((current) => {
      const next = new Set(current)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const showTip = (event: MouseEvent, text: string) => setTip({ text, x: event.clientX, y: event.clientY })

  return (
    <>
      <div className="dc-detail-list">
        <p className="dc-detail-label">Where the time went</p>
        <div className="dc-waterfall-stack" onMouseLeave={() => setTip(null)}>
          {parts.map((part) => (
            <div
              key={part.key}
              className={`dc-waterfall-segment ${part.key}`}
              style={{ flexGrow: part.ms }}
              onMouseMove={(event) => showTip(event, `${part.label} · ${formatMs(part.ms)} · ${Math.round((part.ms / total) * 100)}% of ${formatMs(total)}`)}
            />
          ))}
        </div>
        <div className="dc-waterfall-legend">
          {parts.map((part) => (
            <span key={part.key}>
              <span className={`dc-waterfall-swatch ${part.key}`} />
              {part.label} <span className="dc-detail-muted">{formatMs(part.ms)}</span>
            </span>
          ))}
        </div>
      </div>

      <div className="dc-detail-list">
        <p className="dc-detail-label">Timeline</p>
        <div className="dc-waterfall-axis">
          <span>0 ms</span>
          <span>{formatMs(total)}</span>
        </div>
        <div className="dc-waterfall-rows" onMouseLeave={() => setTip(null)}>
          {rows.map(({ node, depth }) => {
            const { span } = node
            const expandable = node.children.length > 0
            const detail = describe(span)
            const indent = { paddingLeft: `${depth * 0.75}rem` }
            const detailIndent = { paddingLeft: `calc(${depth * 0.75 + 0.75}rem + 20px)` }
            const tipText = `${formatMs(span.start)} → ${formatMs(span.start + span.duration)}${expandable ? ` · own time ${formatMs(ownTime(node))}` : ''}`

            return (
              <div key={node.key} className="dc-waterfall-row" onMouseMove={(event) => showTip(event, tipText)}>
                <button
                  type="button"
                  className={`dc-waterfall-label ${expandable ? 'expandable' : ''}`}
                  style={indent}
                  disabled={!expandable}
                  aria-expanded={expandable ? !collapsed.has(node.key) : undefined}
                  onClick={() => toggle(node.key)}
                >
                  <span className="dc-waterfall-caret">{expandable ? (collapsed.has(node.key) ? '▸' : '▾') : ''}</span>
                  <span className={`dc-waterfall-swatch ${span.category}`} />
                  <span className="dc-waterfall-name">
                    {PREFIX[span.category] && <span className="dc-detail-muted">{PREFIX[span.category]} </span>}
                    {node.label}
                  </span>
                  <span className="dc-waterfall-ms">{formatMs(span.duration)}</span>
                </button>
                {span.sql && <p className="dc-waterfall-sql" style={detailIndent}>{span.sql}</p>}
                {detail && <p className="dc-detail-muted" style={detailIndent}>{detail}</p>}
                <div className="dc-waterfall-track">
                  <div
                    className={`dc-waterfall-bar ${span.category}`}
                    style={{ left: `${(span.start / total) * 100}%`, width: `max(2px, ${(span.duration / total) * 100}%)` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {tip && (
        <div className="dc-waterfall-tip" style={{ left: tip.x + 12, top: tip.y + 12 }}>
          {tip.text}
        </div>
      )}
    </>
  )
}

export default TraceWaterfall
