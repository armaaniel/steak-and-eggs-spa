import { useEffect, useState } from 'react'
import { Link, NavLink, useMatch } from 'react-router-dom'
import ThemeToggle from '../ThemeToggle'
import { DATACAT_SECTIONS as SECTIONS } from '../../lib/datacatSections.ts'
import type { DatacatSection } from '../../lib/datacatSections.ts'

const useActiveSection = (enabled: boolean) => {
  const [active, setActive] = useState<DatacatSection>(SECTIONS[0].id)

  useEffect(() => {
    if (!enabled) return

    const update = () => {
      const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2
      if (atBottom) return setActive(SECTIONS[SECTIONS.length - 1].id)

      const line = window.innerHeight * 0.25
      const passed = SECTIONS.filter(({ id }) => (document.getElementById(id)?.getBoundingClientRect().top ?? Infinity) <= line)
      setActive(passed.length ? passed[passed.length - 1].id : SECTIONS[0].id)
    }

    update()
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [enabled])

  return active
}

const scrollTo = (event: React.MouseEvent, id: DatacatSection) => {
  event.preventDefault()
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

const Sidebar = ({ onHome }: { onHome: boolean }) => {
  const active = useActiveSection(onHome)
  const onLoadTests = useMatch('/datacat/load/*') !== null

  return (
    <div className="sidebar-button-container">
      {SECTIONS.map(({ id, label }) =>
        onHome ? (
          <a key={id} href={`#${id}`} className={`side-button ${active === id ? 'active' : ''}`} onClick={(event) => scrollTo(event, id)}>
            {label}
          </a>
        ) : (
          <Link key={id} to={`/datacat#${id}`} className="side-button">
            {label}
          </Link>
        ),
      )}

      <NavLink to="/datacat/connections" className={({ isActive }) => `side-button ${isActive ? 'active' : ''}`}>
        Active Connections
      </NavLink>

      <NavLink to="/datacat/ingester" className={({ isActive }) => `side-button ${isActive ? 'active' : ''}`}>
        Ingester
      </NavLink>

      <Link to="/datacat/load/http" className={`side-button ${onLoadTests ? 'active' : ''}`}>
        Load Tests
      </Link>

      <ThemeToggle className="dc-theme-toggle" />
    </div>
  )
}

export default Sidebar
