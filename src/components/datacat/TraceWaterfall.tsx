import { useMemo, useState } from 'react'
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

  if (span.cached) parts.push('answered by the query cache')
  if (span.dropped) parts.push(`${span.dropped.toLocaleString('en-us')} more spans weren't stored`)

  return parts.join(' · ')
}

function describeCacheResult(span: Span) {
  if (span.hit === true) {
    return 'hit'
  }

  if (span.hit === false) {
    return 'miss'
  }

  return ''
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

function collapsedBelowTopLevel(nodes: Node[], keys = new Set<string>()) {
  nodes.forEach((node) => {
    node.children.forEach((child) => {
      if (child.children.length > 0) keys.add(child.key)
    })

    collapsedBelowTopLevel(node.children, keys)
  })

  return keys
}

const TraceWaterfall = ({ trace }: Props) => {
  const total = trace.duration
  const tree = useMemo(() => buildTree(trace.spans ?? []), [trace.spans])
  const [collapsed, setCollapsed] = useState(() => collapsedBelowTopLevel(tree))
  const [shownTraceId, setShownTraceId] = useState(trace.id)

  if (trace.id !== shownTraceId) {
    setShownTraceId(trace.id)
    setCollapsed(collapsedBelowTopLevel(tree))
  }

  const timeByCategory = CATEGORIES.map((category) => ({ ...category, ms: Number(trace[category.field] ?? 0) }))
  const parts = timeByCategory.filter((part) => part.ms > 0)

  const toggle = (key: string) => {
    setCollapsed((current) => {
      const next = new Set(current)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  function renderNode(node: Node, depth: number) {
    const { span } = node
    const expandable = node.children.length > 0
    const isOpen = !collapsed.has(node.key)
    const detail = describe(span)
    const cacheResult = describeCacheResult(span)
    const indent = { paddingLeft: `${depth * 0.75}rem` }
    const detailIndent = { paddingLeft: `calc(${depth * 0.75 + 0.75}rem + 6px)` }

    return (
      <div key={node.key}>
        <div className="dc-waterfall-row">
          <button
            type="button"
            className={`dc-waterfall-label ${expandable ? 'expandable' : ''}`}
            style={indent}
            disabled={!expandable}
            aria-expanded={expandable ? isOpen : undefined}
            onClick={() => toggle(node.key)}
          >
            <span className="dc-waterfall-caret">
              {expandable && (
                <svg width="12" height="12" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg" className={`dc-waterfall-chevron ${isOpen ? 'open' : ''}`}>
                  <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </span>
            <span className="dc-waterfall-name">
              {PREFIX[span.category] && <span className="dc-detail-muted">{PREFIX[span.category]} </span>}
              {node.label}
            </span>
            <span className="dc-waterfall-ms">
              {cacheResult && `${cacheResult} · `}
              {formatMs(span.duration)}
            </span>
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

        {expandable && (
          <div className={`dc-waterfall-children ${isOpen ? 'open' : ''}`} inert={!isOpen}>
            <div className="dc-waterfall-children-inner">
              {node.children.map((child) => renderNode(child, depth + 1))}
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <>
      <div className="dc-detail-list">
        <p className="dc-detail-label">Where the time went</p>
        <div className="dc-waterfall-stack">
          {timeByCategory.map((part) => (
            <div key={part.key} className={`dc-waterfall-segment ${part.key} ${part.ms > 0 ? '' : 'empty'}`} style={{ flexGrow: part.ms }} />
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
        <div className="dc-waterfall-rows" key={trace.id}>
          {tree.map((node) => renderNode(node, 0))}
        </div>
      </div>
    </>
  )
}

export default TraceWaterfall
