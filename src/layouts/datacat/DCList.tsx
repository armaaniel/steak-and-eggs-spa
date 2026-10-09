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
      const navbarShownBefore = 1 - Math.abs(slide) / navbarHeight
      navbar.animate([{ opacity: navbarShownBefore }, { opacity: 1 }], timing)
      sliding = page.animate([{ transform: `translateY(${slide}px)` }, { transform: 'translateY(0)' }], timing)
    } else {
      const navbarStartOffset = window.scrollY + slide - navbarHeight
      const navbarEndOffset = window.scrollY - navbarHeight
      navbar.style.position = 'relative'
      navbar.style.zIndex = '1'

      const navbarLeaving = navbar.animate(
        [
          { transform: `translateY(${navbarStartOffset}px)`, opacity: 1 },
          { transform: `translateY(${navbarEndOffset}px)`, opacity: 0 },
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

  const { data, previousData, loading } = useQuery<StatsData>(GET_STATS, {
    variables: { endpoint, range },
    skip: !isEndpointRoute,
  })

  const stats = data?.traceStats
  const lastStats = (data ?? previousData)?.traceStats
  const statsLoaded = useTransition(loading, data)

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
                  loaded={statsLoaded && !loading && (stats?.totalRequests ?? 0) > 0}
                  triggerContent={<>P50: {stats?.p50?.toFixed(0)}ms</>}
                >
                  <p>P95: {stats?.p95?.toFixed(0)}ms</p>
                  <p>P99: {stats?.p99?.toFixed(0)}ms</p>
                  <p>Requests: {stats?.totalRequests?.toFixed(0)}</p>
                  <p>Error Rate: {stats?.errorRate}%</p>
                </StatsPanel>
              )}
            </>
          )}
        </div>

        <div className="dc-home-right">
          <Outlet context={{ detail, setDetail, range, setRange, usedRedis: lastStats?.usedRedis ?? false, usedApi: lastStats?.usedApi ?? false }} />
        </div>
      </div>
    </div>
  )
}
export default DCList
