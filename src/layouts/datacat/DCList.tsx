import { Outlet, useLocation, useMatch } from 'react-router-dom'
import { gql, useQuery } from '@apollo/client'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import '../../stylesheets/datacat/datacat.css'
import '../../stylesheets/datacat/endpoint.css'
import Sidebar from '../../components/datacat/Sidebar'
import DCNavbar from '../../components/datacat/DCNavbar'
import TraceDetailsPanel from '../../components/datacat/TraceDetailsPanel'
import CableConnectionDetailsPanel from '../../components/datacat/CableConnectionDetailsPanel'
import IngesterDetailsPanel from '../../components/datacat/IngesterDetailsPanel'
import DependencyDetailsPanel from '../../components/datacat/DependencyDetailsPanel'
import StatsPanel from '../../components/datacat/StatsPanel'
import useEndpoint from '../../hooks/useEndpoint'
import useDatacatRange from '../../hooks/useDatacatRange'
import type { Detail, TraceStats } from '../../lib/types.ts'

const GET_STATS = gql`
  query getStats($endpoint: String!, $range: String) {
    traceStats(endpoint: $endpoint, range: $range) {
      usedRedis
      usedApi
    }
  }
`

interface StatsData {
  traceStats: CacheFlags
}

interface CacheFlags {
  usedRedis: boolean
  usedApi: boolean
}

const DetailPanel = ({ detail }: { detail: Detail }) => {
  switch (detail.kind) {
    case 'trace':
      return <TraceDetailsPanel trace={detail.trace} />
    case 'cable':
      return <CableConnectionDetailsPanel connection={detail.connection} />
    case 'dependency':
      return <DependencyDetailsPanel node={detail.node} />
    case 'boot':
    case 'connection':
      return <IngesterDetailsPanel detail={detail} />
  }
}

const SLIDE_MS = 250

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function findNavbar() {
  return document.querySelector<HTMLElement>('.dc-root > .navbar')
}

function DCList() {
  const onHome = useMatch('/datacat') !== null
  const onIngester = useMatch('/datacat/ingester') !== null
  const { pathname, hash } = useLocation()
  const lastPathname = useRef(pathname)
  const sidebarRef = useRef<HTMLDivElement>(null)
  const pageRef = useRef<HTMLDivElement>(null)
  const lastSidebarTop = useRef<number | null>(null)

  useEffect(() => {
    function rememberSidebarTop() {
      if (sidebarRef.current !== null) {
        lastSidebarTop.current = sidebarRef.current.getBoundingClientRect().top
      }
    }

    rememberSidebarTop()
    window.addEventListener('scroll', rememberSidebarTop, { passive: true })
    window.addEventListener('resize', rememberSidebarTop)

    return function stopRemembering() {
      window.removeEventListener('scroll', rememberSidebarTop)
      window.removeEventListener('resize', rememberSidebarTop)
    }
  }, [])

  useLayoutEffect(() => {
    if (lastPathname.current === pathname) {
      return
    }

    lastPathname.current = pathname

    if (hash === '') {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
    } else {
      document.getElementById(hash.slice(1))?.scrollIntoView({ block: 'start', behavior: 'instant' })
    }

    const sidebar = sidebarRef.current
    const page = pageRef.current
    const sidebarTopBefore = lastSidebarTop.current

    if (sidebar === null || page === null || sidebarTopBefore === null) {
      return
    }

    const sidebarTopAfter = sidebar.getBoundingClientRect().top
    lastSidebarTop.current = sidebarTopAfter

    const navbar = findNavbar()

    if (navbar === null) {
      return
    }

    const navbarHeight = navbar.getBoundingClientRect().height
    const slide = Math.max(-navbarHeight, Math.min(navbarHeight, sidebarTopBefore - sidebarTopAfter))

    if (Math.abs(slide) < 1 || prefersReducedMotion()) {
      return
    }

    const timing = { duration: SLIDE_MS, easing: 'ease-out' }
    let sliding: Animation

    if (slide < 0) {
      navbar.animate([{ transform: `translateY(${slide}px)` }, { transform: 'translateY(0)' }], timing)
      sliding = page.animate([{ transform: `translateY(${slide}px)` }, { transform: 'translateY(0)' }], timing)
    } else {
      const navbarStartOffset = window.scrollY + slide - navbarHeight
      const navbarEndOffset = window.scrollY - navbarHeight
      navbar.style.position = 'relative'
      navbar.style.zIndex = '1'

      const navbarLeaving = navbar.animate(
        [
          { transform: `translateY(${navbarStartOffset}px)` },
          { transform: `translateY(${navbarEndOffset}px)` },
        ],
        timing,
      )

      navbarLeaving.onfinish = function settleNavbar() {
        navbar.style.position = ''
        navbar.style.zIndex = ''
      }

      sliding = sidebar.animate([{ transform: `translateY(${slide}px)` }, { transform: 'translateY(0)' }], timing)
    }

    sliding.onfinish = function rememberSettledSidebarTop() {
      lastSidebarTop.current = sidebar.getBoundingClientRect().top
    }
  }, [pathname, hash])

  const [detail, setDetail] = useState<Detail | null>(null)
  const [range, setRange] = useDatacatRange()

  const [statsOpen, setStatsOpen] = useState(() => {
    const saved = localStorage.getItem('statsOpen')
    return saved === null ? true : saved === 'true'
  })

  const { method, endpoint } = useEndpoint()
  const isEndpointRoute = Boolean(method)

  const [endpointStats, setEndpointStats] = useState<TraceStats | null>(null)

  const { data, previousData } = useQuery<StatsData>(GET_STATS, {
    variables: { endpoint, range },
    skip: !isEndpointRoute,
  })

  const lastStats = (data ?? previousData)?.traceStats

  const toggleStats = () => {
    const newValue = !statsOpen
    localStorage.setItem('statsOpen', String(newValue))
    setStatsOpen(newValue)
  }

  const closeDetails = () => setDetail(null)

  return (
    <div className="dc-root">
      <DCNavbar />
      <div ref={pageRef} className="dc-home-parent">
        <div ref={sidebarRef} className={`home-left-two ${onHome ? 'sticky' : ''} ${onIngester ? 'narrow' : ''}`}>
          {detail && (
            <div className="dc-side-header-container">
              <h3 className="catlas-text">{detail.kind === 'dependency' ? detail.node.title : 'Details'}</h3>
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
              <Sidebar onHome={onHome} />

              {isEndpointRoute && (
                <StatsPanel
                  isOpen={statsOpen}
                  onToggle={toggleStats}
                  loaded={(endpointStats?.totalRequests ?? 0) > 0}
                  triggerContent={
                    <span>
                      <span className="stats-key">P99:</span> {endpointStats?.p99?.toFixed(0)}ms
                    </span>
                  }
                >
                  <p>
                    <span className="stats-key">P50:</span> {endpointStats?.p50?.toFixed(0)}ms
                  </p>
                  <p>
                    <span className="stats-key">P95:</span> {endpointStats?.p95?.toFixed(0)}ms
                  </p>
                  <p>
                    <span className="stats-key">Requests:</span> {endpointStats?.totalRequests?.toFixed(0)}
                  </p>
                  <p>
                    <span className="stats-key">Error Rate:</span> {endpointStats?.errorRate}%
                  </p>
                </StatsPanel>
              )}
            </>
          )}
        </div>

        <div className="dc-home-right">
          <Outlet context={{ detail, setDetail, range, setRange, usedRedis: lastStats?.usedRedis ?? false, usedApi: lastStats?.usedApi ?? false, setEndpointStats }} />
        </div>
      </div>
    </div>
  )
}
export default DCList
