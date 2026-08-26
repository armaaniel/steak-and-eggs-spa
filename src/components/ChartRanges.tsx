import '../stylesheets/chartranges.css'

interface Props<T extends string> {
  ranges: readonly T[]
  selected: T
  onSelect: (range: T) => void
}

const ChartRanges = <T extends string>({ ranges, selected, onSelect }: Props<T>) => (
  <div className="chart-ranges">
    {ranges.map((range) => (
      <button key={range} className={`chart-range ${range === selected ? 'selected' : ''}`} onClick={() => onSelect(range)}>
        {range}
      </button>
    ))}
  </div>
)

export default ChartRanges
