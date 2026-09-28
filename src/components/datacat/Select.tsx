interface Option {
  value: string | number
  label: string
}

interface Props {
  id: string
  label: string
  value: string | number
  onChange: (value: string) => void
  options: Option[]
  loaded: boolean
}

const Select = ({ id, label, value, onChange, options, loaded }: Props) => {
  return (
    <div className={`status-div ${loaded ? 'loaded' : ''}`}>
      <label htmlFor={id} className="status-label">
        {label}
      </label>

      <select id={id} value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      <div className="select-svg-div">
        <svg width="12" height="12" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </div>
  )
}

export default Select
