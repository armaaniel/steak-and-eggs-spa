import { Outlet, useLocation } from 'react-router-dom'
import { gql, useQuery } from '@apollo/client'
import { useState, useEffect } from 'react'
import '../../stylesheets/datacat/endpoint.css'
import Sidebar from '../../components/datacat/Sidebar'
import DCNavbar from '../../components/datacat/DCNavbar'
import TraceDetailsPanel from '../../components/datacat/TraceDetailsPanel'
import CableConnectionDetailsPanel from '../../components/datacat/CableConnectionDetailsPanel'
import IngesterDetailsPanel from '../../components/datacat/IngesterDetailsPanel'
import StatsPanel from '../../components/datacat/StatsPanel'
import useEndpoint from '../../hooks/useEndpoint'
import type { Trace, ConnectionWithID, IngesterDetail } from '../../lib/types.ts'

const GET_STATS = gql`
  query getStats($endpoint: String!) {
    traceStats(endpoint: $endpoint) {
      p99
      p95
      p50
      totalRequests
      errorRate
    }
  }
`

interface StatsData {
  traceStats: TraceStats
}

interface TraceStats {
  p99: number
  p95: number
  p50: number
  totalRequests: number
  errorRate: number
}

function DCList() {
  const location = useLocation()

  const [loaded, setLoaded] = useState(false)
  const [selectedTrace, setSelectedTrace] = useState<Trace | null>(null)
  const [selectedConnection, setSelectedConnection] = useState<ConnectionWithID | null>(null)
  const [selectedIngesterDetail, setSelectedIngesterDetail] = useState<IngesterDetail | null>(null)

  const [statsOpen, setStatsOpen] = useState(() => {
    const saved = localStorage.getItem('statsOpen')
    return saved === null ? true : saved === 'true'
  })

  const { endpoint } = useEndpoint()
  const { data } = useQuery<StatsData>(GET_STATS, {
    variables: { endpoint },
    skip: !(location.pathname.includes('/get') || location.pathname.includes('/post') || location.pathname.includes('/delete')),
  })

  const stats = data?.traceStats

  const toggleStats = () => {
    const newValue = !statsOpen
    localStorage.setItem('statsOpen', String(newValue))
    setStatsOpen(newValue)
  }

  const closeDetails = () => {
    setSelectedTrace(null)
    setSelectedConnection(null)
    setSelectedIngesterDetail(null)
  }

  useEffect(() => {
    setLoaded(false)
  }, [location.pathname])

  return (
    <div className="dc-root">
      <DCNavbar />
      <div className="dc-home-parent">
        <div className="home-left-two">
          {(selectedTrace || selectedConnection || selectedIngesterDetail) && (
            <div className="dc-side-header-container">
              <h3 className="catlas-text">Details</h3>
              <div className="dc-back-button-container">
                <button className="dc-back-button" onClick={closeDetails}>
                  {' '}
                  x{' '}
                </button>
              </div>
            </div>
          )}

          {selectedTrace ? (
            <TraceDetailsPanel trace={selectedTrace} />
          ) : selectedConnection ? (
            <CableConnectionDetailsPanel connection={selectedConnection} />
          ) : selectedIngesterDetail ? (
            <IngesterDetailsPanel detail={selectedIngesterDetail} />
          ) : (
            <>
              <Sidebar />

              {(location.pathname.includes('/get') || location.pathname.includes('/post')) && (
                <StatsPanel
                  isOpen={statsOpen}
                  onToggle={toggleStats}
                  loaded={loaded && (stats?.totalRequests ?? 0) > 0}
                  triggerContent={<>P50: {stats?.p50?.toFixed(0)}ms</>}
                >
                  <p>P95: {stats?.p95?.toFixed(0)}ms</p>
                  <p>P99: {stats?.p99?.toFixed(0)}ms</p>
                  <p>Requests: {stats?.totalRequests?.toFixed(0)}</p>
                  <p>Error Rate: {stats?.errorRate}%</p>
                </StatsPanel>
              )}

              {location.pathname.includes('/latent') && (
                <StatsPanel isOpen={statsOpen} onToggle={toggleStats} loaded={loaded}>
                  <p>
                    Excludes POST /record <br /> & POST /graphql
                  </p>
                </StatsPanel>
              )}
            </>
          )}
        </div>

        <div className="dc-home-right">
          <Outlet context={{ selectedTrace, setSelectedTrace, loaded, setLoaded, selectedConnection, setSelectedConnection, selectedIngesterDetail, setSelectedIngesterDetail }} />
        </div>
      </div>
    </div>
  )
}
export default DCList
