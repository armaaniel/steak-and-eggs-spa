import { toDuration } from '../../lib/utils.ts'
import type { IngesterSpan } from '../../lib/types.ts'

interface Props {
  spans: IngesterSpan[]
}

// idle is not a fault — the uptime maths subtracts it from the denominator rather than
// counting it against the feed — so it reads as an empty track, not a warning
const spanState = (state: string) => {
  if (state === 'streaming') return 'streaming'
  if (state === 'idle') return 'idle'
  return 'down'
}

const IngesterTimeline = ({ spans }: Props) => {
  const total = spans.reduce((sum, span) => sum + span.seconds, 0)

  let offset = 0

  return (
    <div className="ing-timeline">
      {/* one rect per span, laid out in seconds and stretched to the card — a 24h window
          runs to hundreds of spans, which is more than flex children can place cleanly */}
      <svg width="100%" height="28" viewBox={`0 0 ${total || 1} 1`} preserveAspectRatio="none" shapeRendering="crispEdges">
        {spans.map((span) => {
          const x = offset
          offset += span.seconds

          return (
            <rect key={`${span.at}-${span.bootId}`} className={`ing-span ${spanState(span.state)}`} x={x} y="0" width={span.seconds} height="1">
              <title>
                {new Date(span.at).toLocaleString()} — {span.state} for {toDuration(span.seconds)}
              </title>
            </rect>
          )
        })}
      </svg>
    </div>
  )
}

export default IngesterTimeline
