import type { DependencyNode } from '../../lib/types.ts'
import '../../stylesheets/datacat/dependencies.css'

interface Props {
  nodes: DependencyNode[]
  selectedId: string | null
  onSelect: (node: DependencyNode) => void
}

interface Box {
  x: number
  y: number
  w: number
  tone: string
}

interface EdgeLabel {
  x: number
  y: number
  text: string
  anchor?: 'start' | 'middle'
}

const BOX_HEIGHT = 56

const LAYOUT: Record<string, Box> = {
  vercel:   { x: 30,  y: 76,  w: 130, tone: 'purple' },
  browser:  { x: 30,  y: 164, w: 130, tone: 'grey' },
  mobile:   { x: 30,  y: 244, w: 130, tone: 'grey' },
  canary:   { x: 30,  y: 324, w: 130, tone: 'grey' },
  alb:      { x: 310, y: 164, w: 160, tone: 'blue' },
  redis:    { x: 510, y: 70,  w: 180, tone: 'amber' },
  rails:    { x: 510, y: 164, w: 180, tone: 'teal' },
  postgres: { x: 510, y: 258, w: 180, tone: 'blue' },
  polygon:  { x: 750, y: 70,  w: 180, tone: 'pink' },
  ingester: { x: 750, y: 258, w: 180, tone: 'coral' },
}

const EDGES = [
  'M95 132V162',
  'M160 192H308',
  'M160 272H292V192H308',
  'M160 352H292V192H308',
  'M470 192H508',
  'M600 164V128',
  'M600 220V256',
  'M772 258L672 128',
  'M750 286H692',
  'M690 180H730V98H748',
  'M840 126V256',
]

const EDGE_LABELS: EdgeLabel[] = [
  { x: 226, y: 266, text: 'HTTPS + WSS' },
  { x: 226, y: 346, text: 'synthetic' },
  { x: 489, y: 185, text: 'HTTP' },
  { x: 489, y: 207, text: 'WS' },
  { x: 781, y: 226, text: 'SET + PUB' },
  { x: 721, y: 279, text: 'Ticker list' },
  { x: 745, y: 152, text: 'GET' },
  { x: 849, y: 195, text: 'WebSocket', anchor: 'start' },
]

const DependencyMap = ({ nodes, selectedId, onSelect }: Props) => {
  return (
    <svg className="dep-map" viewBox="0 30 960 360" role="group" aria-label="Steak & Eggs architecture">
      <defs>
        <marker id="dep-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="m2 1 6 4-6 4" className="dep-arrowhead" />
        </marker>
      </defs>

      <text x="600" y="48" textAnchor="middle" className="dep-region">AWS VPC (us-west-1)</text>

      {EDGES.map((d) => (
        <path key={d} d={d} className="dep-edge" markerEnd="url(#dep-arrow)" />
      ))}

      {EDGE_LABELS.map((label) => (
        <text key={label.text} x={label.x} y={label.y} textAnchor={label.anchor ?? 'middle'} className="dep-edge-label">
          {label.text}
        </text>
      ))}

      {nodes.map((node) => {
        const box = LAYOUT[node.id]
        const center = box.x + box.w / 2
        const select = () => onSelect(node)

        return (
          <g
            key={node.id}
            className={`dep-node ${box.tone} ${node.id === selectedId ? 'selected' : ''}`}
            role="button"
            tabIndex={0}
            aria-label={`${node.title}: ${node.statusLabel}`}
            onClick={select}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                select()
              }
            }}
          >
            <rect x={box.x} y={box.y} width={box.w} height={BOX_HEIGHT} rx="8" />
            <text x={center} y={box.y + 21} textAnchor="middle" dominantBaseline="central" className="dep-title">
              {node.title}
            </text>
            <text x={center} y={box.y + 39} textAnchor="middle" dominantBaseline="central" className="dep-role">
              {node.role}
            </text>
            {node.status !== 'none' && <circle cx={box.x + box.w - 12} cy={box.y + 12} r="4" className={`dep-status ${node.status}`} />}
          </g>
        )
      })}
    </svg>
  )
}

export default DependencyMap
