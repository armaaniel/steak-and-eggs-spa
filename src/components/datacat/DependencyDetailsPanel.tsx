import Sparkline from './Sparkline'
import type { DependencyNode } from '../../lib/types.ts'
import '../../stylesheets/datacat/dependencies.css'

interface Props {
  node: DependencyNode
}

const DependencyDetailsPanel = ({ node }: Props) => {
  return (
    <div className="sidebar-button-container two">
      <div className="trace-details">
        {node.metrics.length > 0 && <p>Last hour:</p>}
        <p>Status: {node.statusLabel}</p>

        {node.metrics.map((metric) => (
          <div key={metric.label}>
            <p>
              {metric.label}: {metric.value}
            </p>
            {metric.points && <Sparkline points={metric.points} color={metric.color ?? 'var(--dc-series-1)'} />}
          </div>
        ))}

        {node.note && <p>{node.note}</p>}
      </div>
    </div>
  )
}

export default DependencyDetailsPanel
