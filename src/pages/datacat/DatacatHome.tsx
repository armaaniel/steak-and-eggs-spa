import { useEffect } from 'react'
import type { ComponentType } from 'react'
import { useLocation, useOutletContext } from 'react-router-dom'
import Overview from './Overview'
import Dependencies from './Dependencies'
import Uptime from './Uptime'
import Routes from './Routes'
import Select from '../../components/datacat/Select'
import { DATACAT_RANGE_OPTIONS } from '../../hooks/useDatacatRange'
import { DATACAT_SECTIONS } from '../../lib/datacatSections.ts'
import type { DatacatSection } from '../../lib/datacatSections.ts'
import type { OutletContextType } from '../../lib/types.ts'
import '../../stylesheets/datacat/endpoint.css'

const SECTION_PAGES: Record<DatacatSection, ComponentType> = {
  overview: Overview,
  uptime: Uptime,
  dependencies: Dependencies,
  routes: Routes,
}

function DatacatHome() {
  const { range, setRange } = useOutletContext<OutletContextType>()
  const { hash } = useLocation()

  useEffect(() => {
    const target = hash ? document.getElementById(hash.slice(1)) : null
    const sections = target?.parentElement
    if (!target || !sections) return

    const align = () => target.scrollIntoView({ block: 'start' })
    const observer = new ResizeObserver(align)
    const stop = () => {
      observer.disconnect()
      window.removeEventListener('wheel', stop)
      window.removeEventListener('touchstart', stop)
      window.removeEventListener('keydown', stop)
    }

    align()
    observer.observe(sections)
    window.addEventListener('wheel', stop, { passive: true })
    window.addEventListener('touchstart', stop, { passive: true })
    window.addEventListener('keydown', stop)
    const timer = setTimeout(stop, 5000)

    return () => {
      clearTimeout(timer)
      stop()
    }
  }, [hash])

  return (
    <>
      <div className="range-header">
        <Select id="range-select" label="Range" value={range} onChange={setRange} options={DATACAT_RANGE_OPTIONS} loaded={true} />
      </div>

      {DATACAT_SECTIONS.map(({ id }) => {
        const Section = SECTION_PAGES[id]

        return (
          <section key={id} id={id} className="dc-section">
            <Section />
          </section>
        )
      })}
    </>
  )
}

export default DatacatHome
