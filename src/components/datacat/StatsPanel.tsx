interface Props {
  isOpen: boolean
  onToggle: () => void
  loaded: boolean
  triggerContent?: React.ReactNode
  children: React.ReactNode
}

const StatsPanel = ({ isOpen, onToggle, loaded, triggerContent, children }: Props) => {
  return (
    <div className={`stats-container ${loaded ? 'loaded' : ''}`}>
      <div className="trace-details two">
        <p className="p50" onClick={onToggle}>
          {triggerContent}
          <svg width="12" height="12" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg" className={`stats-v ${isOpen ? 'open' : ''}`}>
            <path d="M2 3.5L5 6.5L8 3.5" stroke="rgb(104,102,100)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </p>

        <div className={`stats-dropdown ${isOpen ? 'open' : ''}`}>
          {children}
        </div>
      </div>
    </div>
  )
}

export default StatsPanel
