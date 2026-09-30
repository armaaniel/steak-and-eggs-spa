interface Option<T> {
  value: T
  label: string
}

interface Props<T> {
  id: string
  label: string
  value: T
  onChange: (value: T) => void
  options: Option<T>[]
  loaded: boolean
}

const Select = <T extends string | number>({ id, label, value, onChange, options, loaded }: Props<T>) => {
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const picked = options.find((option) => String(option.value) === e.target.value)
    if (picked) onChange(picked.value)
  }

  return (
    <div className={`status-div ${loaded ? 'loaded' : ''}`}>
      <label htmlFor={id} className="status-label">
        {label}
      </label>

      <select id={id} value={value} onChange={handleChange}>
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
