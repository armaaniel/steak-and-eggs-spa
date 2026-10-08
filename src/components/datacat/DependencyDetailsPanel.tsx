import type { DependencyNode } from '../../lib/types.ts'
import '../../stylesheets/datacat/dependencies.css'

interface Props {
  node: DependencyNode
}

const DependencyDetailsPanel = ({ node }: Props) => {
  return (
    <div className="sidebar-button-container two">
      <div className="trace-details">
        <p>Status now: {node.statusLabel}</p>

        {node.metrics.map((metric) => (
          <div key={metric.label}>
            <p>
              {metric.label}: {metric.value}
            </p>
          </div>
        ))}

        {node.note && <p>{node.note}</p>}
      </div>
    </div>
  )
}

export default DependencyDetailsPanel
