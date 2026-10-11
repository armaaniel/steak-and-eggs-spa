import { useEffect, useRef, useState } from 'react'
import useClickOutside from '../../hooks/useClickOutside'
import '../../stylesheets/datacat/select.css'

export interface Option<T> {
  value: T
  label: string
  pill?: string
}

interface Props<T> {
  label: string
  value: T
  onChange: (value: T) => void
  options: Option<T>[]
  loaded: boolean
  align?: 'left' | 'right'
}

const Select = <T extends string | number>({ label, value, onChange, options, loaded, align = 'left' }: Props<T>) => {
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

  const handleSelect = (picked: T) => {
    onChange(picked)
    setOpen(false)
  }

  const selected = options.find((option) => option.value === value)

  return (
    <div ref={wrapRef} className={`dc-select ${loaded ? 'loaded' : ''}`}>
      <button ref={triggerRef} type="button" className={`dc-select-trigger ${selected?.pill ? 'pill' : ''}`} aria-haspopup="menu" aria-expanded={open} aria-label={selected?.label} title={selected?.label} onClick={() => setOpen(!open)}>
        {selected?.pill ?? selected?.label}
      </button>

      {open && (
        <ul className={`dc-select-options ${align}`} role="menu" aria-label={label}>
          {options.map((option) => (
            <li key={option.value} role="none">
              <button type="button" className={`dc-select-option ${option.pill ? 'pill' : ''}`} role="menuitemradio" aria-checked={option.value === value} onClick={() => handleSelect(option.value)}>
                {option.pill && <span className="dc-select-pill">{option.pill}</span>}
                {option.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default Select
