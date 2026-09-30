import { Link } from 'react-router-dom'
import type { DependencyNode } from '../../lib/types.ts'
import '../../stylesheets/datacat/dependencies.css'

interface Props {
  node: DependencyNode
}

const DependencyDetailsPanel = ({ node }: Props) => {
  return (
    <div className="sidebar-button-container two">
      <div className="trace-details">
        <p>{node.title}</p>
        <p>{node.role}</p>
        <p>Status: {node.statusLabel}</p>

        {node.metrics.map((metric) => (
          <p key={metric.label}>
            {metric.label}: {metric.value}
          </p>
        ))}

        {node.note && <p>{node.note}</p>}

        {node.link && (
          <Link to={node.link.to} className="dep-link">
            {node.link.label}
          </Link>
        )}
      </div>
    </div>
  )
}

export default DependencyDetailsPanel
