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

        {node.setup !== undefined && (
          <>
            <hr className="dc-detail-divider" />
            <DetailRows rows={node.setup} inline />
          </>
        )}

        {node.jobs !== undefined && (
          <>
            <hr className="dc-detail-divider" />
            <DetailRows rows={node.jobs} inline />
          </>
        )}
      </div>
    </div>
  )
}

export default DependencyDetailsPanel
