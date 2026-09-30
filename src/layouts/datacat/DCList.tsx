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
import useDatacatRange from '../../hooks/useDatacatRange'
import useTransition from '../../hooks/useTransition.ts'
import type { Detail } from '../../lib/types.ts'

const GET_STATS = gql`
  query getStats($endpoint: String!, $range: String) {
    traceStats(endpoint: $endpoint, range: $range) {
      p99
      p95
      p50
      totalRequests
      errorRate
      usedRedis
      usedApi
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
  usedRedis: boolean
  usedApi: boolean
}

const DetailPanel = ({ detail }: { detail: Detail }) => {
  switch (detail.kind) {
    case 'trace':
      return <TraceDetailsPanel trace={detail.trace} />
    case 'cable':
      return <CableConnectionDetailsPanel connection={detail.connection} />
    case 'boot':
    case 'connection':
      return <IngesterDetailsPanel detail={detail} />
  }
}

function DCList() {
  const location = useLocation()

  const [loaded, setLoaded] = useState(false)
  const [detail, setDetail] = useState<Detail | null>(null)
  const [range, setRange] = useDatacatRange()

  const [statsOpen, setStatsOpen] = useState(() => {
    const saved = localStorage.getItem('statsOpen')
    return saved === null ? true : saved === 'true'
  })

  const { method, endpoint } = useEndpoint()
  const isEndpointRoute = Boolean(method)

  const { data, loading } = useQuery<StatsData>(GET_STATS, {
    variables: { endpoint, range },
    skip: !isEndpointRoute,
  })

  const stats = data?.traceStats
  const statsLoaded = useTransition(loading, data)

  const toggleStats = () => {
    const newValue = !statsOpen
    localStorage.setItem('statsOpen', String(newValue))
    setStatsOpen(newValue)
  }

  const closeDetails = () => setDetail(null)

  useEffect(() => {
    setLoaded(false)
  }, [location.pathname])

  return (
    <div className="dc-root">
      <DCNavbar />
      <div className="dc-home-parent">
        <div className="home-left-two">
          {detail && (
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

          {detail ? (
            <DetailPanel detail={detail} />
          ) : (
            <>
              <Sidebar />

              {isEndpointRoute && (
                <StatsPanel
                  isOpen={statsOpen}
                  onToggle={toggleStats}
                  loaded={statsLoaded && (stats?.totalRequests ?? 0) > 0}
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
                    Excludes POST /graphql
                  </p>
                </StatsPanel>
              )}
            </>
          )}
        </div>

        <div className="dc-home-right">
          <Outlet context={{ detail, setDetail, setLoaded, range, setRange, usedRedis: stats?.usedRedis ?? false, usedApi: stats?.usedApi ?? false }} />
        </div>
      </div>
    </div>
  )
}
export default DCList
