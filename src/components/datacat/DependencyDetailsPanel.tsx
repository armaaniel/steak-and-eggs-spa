import DetailRows from './DetailRows'
import type { DependencyNode } from '../../lib/types.ts'
import '../../stylesheets/datacat/dependencies.css'

interface Props {
  node: DependencyNode
}

const DependencyDetailsPanel = ({ node }: Props) => {
  return (
    <div className="sidebar-button-container two">
      <div className="trace-details">
        <p className="dc-detail-muted">{node.role}</p>
        <p>{node.statusLabel}</p>

        <DetailRows rows={node.metrics} />

        {node.note && <p className="dc-detail-muted">{node.note}</p>}
      </div>
    </div>
  )
}

export default DependencyDetailsPanel
