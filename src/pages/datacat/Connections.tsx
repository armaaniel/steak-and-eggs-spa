import { useOutletContext } from 'react-router-dom'
import { gql, useQuery } from '@apollo/client'
import TraceTable from '../../components/datacat/TraceTable'
import useTransition from '../../hooks/useTransition.ts'
import type { OutletContextType, Column, Connection, ConnectionWithID } from '../../lib/types.ts'

const GET_CONNECTIONS = gql`
  query getConnections {
    connections {
      startedAt
      connectionState
      subscriptions {
        channel
        symbol
      }
    }
  }
`

interface ConnectionsData {
  connections: Connection[]
}

function Connections() {
  const { detail, setDetail } = useOutletContext<OutletContextType>()
  const selectedConnection = detail?.kind === 'cable' ? detail.connection : null
  const selectConnection = (connection: ConnectionWithID) => setDetail({ kind: 'cable', connection })

  const recordsPerPage = 18

  const { loading, error, data } = useQuery<ConnectionsData>(GET_CONNECTIONS)

  const isLoaded = useTransition(loading, data || error)

  const columns: Column<ConnectionWithID>[] = [
    { key: 'startedAt', label: 'Started At', sortable: false, render: (connection) => new Date(connection.startedAt).toLocaleString() },
    { key: 'subscriptions', label: 'Subscriptions', sortable: false, render: (connection) => `${connection.subscriptions?.length}` },
  ]

  const connections: ConnectionWithID[] = (data?.connections || []).map((conn, index) => ({
    ...conn,
    id: index,
  }))

  const emptyMessage = 'No active connections'

  return (
    <div className={`positions-container ${isLoaded ? 'loaded' : ''}`}>
      <TraceTable traceData={connections} columns={columns} selectedTrace={selectedConnection} setSelectedTrace={selectConnection} recordsPerPage={recordsPerPage} error={error} emptyMessage={emptyMessage} />
    </div>
  )
}

export default Connections
