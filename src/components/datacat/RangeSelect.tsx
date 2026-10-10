import { useEffect, useRef, useState } from 'react'
import useClickOutside from '../../hooks/useClickOutside'
import { DATACAT_RANGES, DATACAT_RANGE_LABELS, type DatacatRange } from '../../hooks/useDatacatRange'
import '../../stylesheets/datacat/rangeselect.css'

interface Props {
  value: DatacatRange
  onChange: (range: DatacatRange) => void
  loaded: boolean
}

const RangeSelect = ({ value, onChange, loaded }: Props) => {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  useClickOutside(wrapRef, () => setOpen(false), open)

  useEffect(() => {
    if (!open) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      setOpen(false)
      triggerRef.current?.focus()
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open])

  const handleSelect = (range: DatacatRange) => {
    onChange(range)
    setOpen(false)
  }

  return (
    <div ref={wrapRef} className={`range-select ${open ? 'open' : ''} ${loaded ? 'loaded' : ''}`}>
      <button ref={triggerRef} type="button" className="range-select-trigger" aria-haspopup="menu" aria-expanded={open} aria-label={DATACAT_RANGE_LABELS[value]} title={DATACAT_RANGE_LABELS[value]} onClick={() => setOpen(!open)}>
        <span className="range-select-pill">{value}</span>
      </button>

      {open && (
        <ul className="range-select-options" role="menu" aria-label="Range">
          {DATACAT_RANGES.map((range) => (
            <li key={range} role="none">
              <button type="button" className="range-select-option" role="menuitemradio" aria-checked={range === value} onClick={() => handleSelect(range)}>
                <span className="range-select-pill">{range}</span>
                {DATACAT_RANGE_LABELS[range]}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default RangeSelect
