import { Outlet, useLocation } from 'react-router-dom'
import { gql, useQuery } from '@apollo/client'
import { useState, useEffect } from 'react'
import '../../stylesheets/desktop/endpoint.css'
import Sidebar from '../../components/desktop/Sidebar'
import DCNavbar from '../../components/desktop/DCNavbar'
import useEndpoint from '../../hooks/useEndpoint'
import type { Trace, ConnectionWithID } from '../../types.ts'

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

  const [statsOpen, setStatsOpen] = useState(() => {
    const saved = localStorage.getItem('statsOpen')
    return saved === null ? true : saved === 'true'
  })

  const { endpoint } = useEndpoint()
  const { data } = useQuery<StatsData>(GET_STATS, {
    variables: { endpoint },
    skip: !(location.pathname.includes('/get') || location.pathname.includes('/post')),
  })

  const stats = data?.traceStats

  const toggleStats = () => {
    const newValue = !statsOpen
    localStorage.setItem('statsOpen', String(newValue))
    setStatsOpen(newValue)
  }

  useEffect(() => {
    setLoaded(false)
  }, [location.pathname])

  return (
    <>
      <DCNavbar />
      <div className="dc-home-parent">
        <div className="home-left-two">
          {(selectedTrace || selectedConnection) && (
            <div className="dc-side-header-container">
              <h3 className="catlas-text">Details</h3>
              <div className="dc-back-button-container">
                <button
                  className="dc-back-button"
                  onClick={() => {
                    setSelectedTrace(null)
                    setSelectedConnection(null)
                  }}
                >
                  {' '}
                  x{' '}
                </button>
              </div>
            </div>
          )}

          {selectedTrace ? (
            <div className="sidebar-button-container two">
              <div className="trace-details">
                <p>ID: {selectedTrace.id}</p>
                <p>Endpoint: {selectedTrace.endpoint}</p>
                <p>Duration: {selectedTrace.duration.toFixed(0)}ms</p>
                <p>DB Runtime: {selectedTrace.dbRuntime.toFixed(0)}ms</p>
                <p>View Runtime: {selectedTrace.viewRuntime.toFixed(0)}ms</p>
                <p>Status: {selectedTrace.status}</p>
                <p>Created At: {new Date(selectedTrace.createdAt).toLocaleString()}</p>
                <p>
                  Controller Method: {selectedTrace.controller}#{selectedTrace.action}
                </p>

                {selectedTrace.breakdown && Object.keys(selectedTrace.breakdown).length > 0 && (
                  <div>
                    <p>Service call:</p>
                    {Object.entries(selectedTrace.breakdown).map(([serviceName, data]) => (
                      <div className='call-breakdown' key={serviceName}>{serviceName}
                        <p>duration: {`${data.duration.toFixed(2)}ms`}</p>
                        {data.used_redis !== undefined && <p>{`used_redis: ${data.used_redis}`}</p>}
                        {data.used_db !== undefined && <p>{`used_db: ${data.used_db}`}</p>}
                        {data.used_api !== undefined && <p>{`used_api: ${data.used_api}`}</p>}
                        {data.operation !== undefined && <p>{`operation: ${data.operation}`}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : selectedConnection ? (
            <div className="sidebar-button-container two">
              <div className="trace-details">
                <p>Started At: {new Date(selectedConnection.startedAt).toLocaleString()}</p>
                <p>Alive?: {selectedConnection.connectionState}</p>

                {selectedConnection.subscriptions.length > 0 && (
                  <div>
                    <p>Subscriptions:</p>
                    <div className="trace-breakdown">
                      {selectedConnection.subscriptions.map((sub, index) => (
                        <div key={index}>
                          <p>channel: {sub.channel}</p>
                          <p>symbol: {sub.symbol}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <>
              <Sidebar />

              {(location.pathname.includes('/get') || location.pathname.includes('/post')) && (
                <div className={`stats-container ${loaded && (stats?.totalRequests ?? 0) > 0 ? 'loaded' : ''}`}>
                  <div className="trace-details two">
                    <p className="p50" onClick={toggleStats}>
                      P50: {stats?.p50?.toFixed(0)}ms
                      <svg width="12" height="12" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg" className={`stats-v ${statsOpen ? 'open' : ''}`}>
                        <path d="M2 3.5L5 6.5L8 3.5" stroke="rgb(104,102,100)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </p>

                    <div className={`stats-dropdown ${statsOpen ? 'open' : ''}`}>
                      <p>P95: {stats?.p95?.toFixed(0)}ms</p>
                      <p>P99: {stats?.p99?.toFixed(0)}ms</p>
                      <p>Requests: {stats?.totalRequests?.toFixed(0)}</p>
                      <p>Error Rate: {stats?.errorRate}%</p>
                    </div>
                  </div>
                </div>
              )}

              {location.pathname.includes('/latent') && (
                <div className={`stats-container ${loaded ? 'loaded' : ''}`}>
                  <div className="trace-details two">
                    <p className="p50" onClick={toggleStats}>
                      <svg width="12" height="12" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg" className={`stats-v ${statsOpen ? 'open' : ''}`}>
                        <path d="M2 3.5L5 6.5L8 3.5" stroke="rgb(104,102,100)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </p>

                    <div className={`stats-dropdown ${statsOpen ? 'open' : ''}`}>
                      <p>
                        Excludes POST /record <br /> & POST /graphql
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="dc-home-right">
          <Outlet context={{ selectedTrace, setSelectedTrace, loaded, setLoaded, selectedConnection, setSelectedConnection }} />
        </div>
      </div>
    </>
  )
}
export default DCList
