export interface AxisLabel {
  key: string
  text: string
  x: number
  y: number
  opacity: number
}

interface Props {
  xLabels: AxisLabel[]
  yLabels: AxisLabel[]
  plotLeft: number
  plotRight: number
}

const LiveAxis = ({ xLabels, yLabels, plotLeft, plotRight }: Props) => {
  function renderYLabel(label: AxisLabel) {
    return (
      <g key={label.key} opacity={label.opacity}>
        <line className="live-grid" x1={plotLeft} x2={plotRight} y1={label.y} y2={label.y} />
        <text className="live-label" x={label.x} y={label.y} dy="0.32em">
          {label.text}
        </text>
      </g>
    )
  }

  function renderXLabel(label: AxisLabel) {
    return (
      <text key={label.key} className="live-label" x={label.x} y={label.y} textAnchor="middle" opacity={label.opacity}>
        {label.text}
      </text>
    )
  }

  return (
    <>
      {yLabels.map(renderYLabel)}
      {xLabels.map(renderXLabel)}
    </>
  )
}

export default LiveAxis
