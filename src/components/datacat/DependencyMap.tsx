import { Fragment } from 'react'
import type { DependencyNode, DependencyView } from '../../lib/types.ts'
import '../../stylesheets/datacat/dependencies.css'

interface Props {
  view: DependencyView
  nodes: DependencyNode[]
  selectedId: string | null
  onSelect: (node: DependencyNode) => void
}

interface Box {
  x: number
  y: number
  w: number
  tone: string
  h?: number
  stacked?: boolean
  copies?: string[]
}

interface EdgeLabel {
  x: number
  y: number
  text: string
  anchor?: 'start' | 'middle' | 'end'
}

interface Layout {
  region?: { x: number; y: number }
  boxes: Record<string, Box>
  edges: string[]
  edgeLabels: EdgeLabel[]
}

const BOX_HEIGHT = 56
const STACK_OFFSET = 6
const COPY_GAP = 6

const LAYOUTS: Record<DependencyView, Layout> = {
  live: {
    region: { x: 600, y: 48 },
    boxes: {
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
    },
    edges: [
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
    ],
    edgeLabels: [
      { x: 226, y: 266, text: 'HTTPS + WSS' },
      { x: 489, y: 185, text: 'HTTP' },
      { x: 489, y: 207, text: 'WS' },
      { x: 781, y: 226, text: 'SET + PUB' },
      { x: 721, y: 279, text: 'Ticker list' },
      { x: 745, y: 152, text: 'GET' },
      { x: 849, y: 195, text: 'WebSocket', anchor: 'start' },
    ],
  },
  scaled: {
    region: { x: 600, y: 48 },
    boxes: {
      vercel:   { x: 30,  y: 76,  w: 130, tone: 'purple' },
      browser:  { x: 30,  y: 164, w: 130, tone: 'grey' },
      mobile:   { x: 30,  y: 244, w: 130, tone: 'grey' },
      canary:   { x: 30,  y: 324, w: 130, tone: 'grey' },
      alb:      { x: 200, y: 164, w: 105, tone: 'blue' },
      api:      { x: 370, y: 100, w: 198, tone: 'teal', copies: ['us-west-1a', 'us-west-1c'] },
      cable:    { x: 370, y: 236, w: 198, tone: 'teal', copies: ['us-west-1a', 'us-west-1c'] },
      postgres: { x: 600, y: 100, w: 156, tone: 'blue', stacked: true },
      redis:    { x: 600, y: 236, w: 156, tone: 'amber', stacked: true },
      polygon:  { x: 840, y: 100, w: 110, tone: 'pink' },
      ingester: { x: 840, y: 236, w: 110, tone: 'coral' },
    },
    edges: [
      'M95 132V162',
      'M160 192H198',
      'M160 272H180V192H198',
      'M160 352H180V192H198',
      'M305 192H330V128H368',
      'M305 192H330V264H368',
      'M568 128H598',
      'M540 158L636 228',
      'M568 264H598',
      'M520 98V70H895V98',
      'M895 156V234',
      'M840 264H764',
    ],
    edgeLabels: [
      { x: 186, y: 266, text: 'HTTPS + WSS', anchor: 'start' },
      { x: 366, y: 121, text: 'HTTP', anchor: 'end' },
      { x: 366, y: 279, text: 'WS /cable', anchor: 'end' },
      { x: 583, y: 257, text: 'SUB' },
      { x: 790, y: 63, text: 'GET' },
      { x: 887, y: 200, text: 'WebSocket', anchor: 'end' },
      { x: 801, y: 279, text: 'SET + PUB' },
    ],
  },
  box: {
    boxes: {
      vercel:   { x: 30,  y: 76,  w: 130, tone: 'purple' },
      browser:  { x: 30,  y: 164, w: 130, tone: 'grey' },
      mobile:   { x: 30,  y: 244, w: 130, tone: 'grey' },
      canary:   { x: 30,  y: 324, w: 130, tone: 'grey' },
      ec2:      { x: 195, y: 124, w: 725, h: 120, tone: 'frame' },
      proxy:    { x: 215, y: 164, w: 115, tone: 'blue' },
      rails:    { x: 380, y: 164, w: 150, tone: 'teal' },
      redis:    { x: 575, y: 164, w: 130, tone: 'amber' },
      ingester: { x: 770, y: 164, w: 130, tone: 'coral' },
      polygon:  { x: 575, y: 50,  w: 130, tone: 'pink' },
      postgres: { x: 575, y: 300, w: 130, tone: 'blue' },
    },
    edges: [
      'M95 132V162',
      'M160 192H213',
      'M160 272H180V192H213',
      'M160 352H180V192H213',
      'M330 192H378',
      'M530 192H573',
      'M770 192H707',
      'M455 164V78H573',
      'M707 78H835V162',
      'M455 220V328H573',
      'M835 220V328H707',
    ],
    edgeLabels: [
      { x: 186, y: 266, text: 'HTTPS + WSS', anchor: 'start' },
      { x: 354, y: 185, text: 'HTTP' },
      { x: 354, y: 207, text: 'WS' },
      { x: 737, y: 185, text: 'SET + PUB' },
      { x: 447, y: 110, text: 'GET', anchor: 'end' },
      { x: 843, y: 110, text: 'WebSocket', anchor: 'start' },
      { x: 843, y: 290, text: 'Ticker list', anchor: 'start' },
    ],
  },
}

const cardsFor = (box: Box, role: string) => {
  if (!box.copies) return [{ x: box.x, w: box.w, role }]

  const w = (box.w - COPY_GAP * (box.copies.length - 1)) / box.copies.length
  return box.copies.map((copy, index) => ({ x: box.x + index * (w + COPY_GAP), w, role: copy }))
}

const DependencyMap = ({ view, nodes, selectedId, onSelect }: Props) => {
  const { region, boxes, edges, edgeLabels } = LAYOUTS[view]
  const isFrame = (node: DependencyNode) => boxes[node.id].h !== undefined

  const renderNode = (node: DependencyNode) => {
    const box = boxes[node.id]
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
        {box.h !== undefined ? (
          <>
            <rect x={box.x} y={box.y} width={box.w} height={box.h} rx="12" />
            <text x={box.x + 14} y={box.y + 20} dominantBaseline="central">
              <tspan className="dep-title">{node.title}</tspan>
              <tspan dx="8" className="dep-role">
                {node.role}
              </tspan>
            </text>
          </>
        ) : (
          <>
            {box.stacked && <rect x={box.x + STACK_OFFSET} y={box.y - STACK_OFFSET} width={box.w} height={BOX_HEIGHT} rx="8" />}
            {cardsFor(box, node.role).map((card) => {
              const center = card.x + card.w / 2

              return (
                <Fragment key={card.x}>
                  <rect x={card.x} y={box.y} width={card.w} height={BOX_HEIGHT} rx="8" />
                  <text x={center} y={box.y + 21} textAnchor="middle" dominantBaseline="central" className="dep-title">
                    {node.title}
                  </text>
                  <text x={center} y={box.y + 39} textAnchor="middle" dominantBaseline="central" className="dep-role">
                    {card.role}
                  </text>
                </Fragment>
              )
            })}
            {node.status !== 'none' && <circle cx={box.x + box.w - 12} cy={box.y + 12} r="4" className={`dep-status ${node.status}`} />}
          </>
        )}
      </g>
    )
  }

  return (
    <svg className="dep-map" viewBox="0 30 960 360" role="group" aria-label="Steak & Eggs architecture">
      <defs>
        <marker id="dep-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="m2 1 6 4-6 4" className="dep-arrowhead" />
        </marker>
      </defs>

      {region && (
        <text x={region.x} y={region.y} textAnchor="middle" className="dep-region">
          AWS VPC (us-west-1)
        </text>
      )}

      {nodes.filter(isFrame).map(renderNode)}

      {edges.map((d) => (
        <path key={d} d={d} className="dep-edge" markerEnd="url(#dep-arrow)" />
      ))}

      {edgeLabels.map((label) => (
        <text key={label.text} x={label.x} y={label.y} textAnchor={label.anchor ?? 'middle'} className="dep-edge-label">
          {label.text}
        </text>
      ))}

      {nodes.filter((node) => !isFrame(node)).map(renderNode)}
    </svg>
  )
}

export default DependencyMap
