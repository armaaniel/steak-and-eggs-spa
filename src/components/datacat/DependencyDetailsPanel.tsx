import type { DependencyNode } from '../../lib/types.ts'
import '../../stylesheets/datacat/dependencies.css'

interface Props {
  node: DependencyNode
}

const DependencyDetailsPanel = ({ node }: Props) => {
  return (
    <div className="sidebar-button-container two">
      <div className="trace-details">
        <p className="dep-detail-role">{node.role}</p>
        <p>{node.statusLabel}</p>

        {node.metrics.length > 0 && (
          <dl className="dep-detail-metrics">
            {node.metrics.map((metric) => (
              <div key={metric.label}>
                <dt>{metric.label}</dt>
                <dd>{metric.value}</dd>
              </div>
            ))}
          </dl>
        )}

        {node.note && <p className="dep-detail-note">{node.note}</p>}
      </div>
    </div>
  )
}

export default DependencyDetailsPanel
