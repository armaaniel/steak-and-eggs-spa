import { useState } from 'react'
import '../../stylesheets/datacat/segmentedtoggle.css'

interface Option<T> {
  value: T
  label: string
}

interface Props<T> {
  label: string
  value: T
  onChange: (value: T) => void
  options: Option<T>[]
  loaded: boolean
}

const SegmentedToggle = <T extends string | number>({ label, value, onChange, options, loaded }: Props<T>) => {
  const [expanded, setExpanded] = useState(false)

  const handleClick = (clicked: T) => {
    if (clicked === value) {
      setExpanded(!expanded)
    } else {
      onChange(clicked)
    }
  }

  return (
    <div className={`segmented-toggle ${loaded ? 'loaded' : ''}`} role="group" aria-label={label} title={label}>
      {options.map((option) => {
        const picked = option.value === value
        const shown = expanded || picked

        return (
          <div key={option.value} className={`segmented-toggle-slot ${shown ? 'shown' : ''}`} inert={!shown}>
            <div className="segmented-toggle-clip">
              <button type="button" className="segmented-toggle-option" aria-pressed={picked} aria-expanded={picked ? expanded : undefined} onClick={() => handleClick(option.value)}>
                {option.label}
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default SegmentedToggle
