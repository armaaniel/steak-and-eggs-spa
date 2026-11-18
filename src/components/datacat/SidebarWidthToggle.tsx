interface Props {
  wide: boolean
  onToggle: () => void
}

const SidebarWidthToggle = ({ wide, onToggle }: Props) => {
  let label = 'Widen sidebar'
  let arrow = '>'

  if (wide) {
    label = 'Narrow sidebar'
    arrow = '<'
  }

  return (
    <button type="button" className="dc-sidebar-edge" onClick={onToggle} aria-label={label}>
      <span className="dc-sidebar-edge-arrow">{arrow}</span>
    </button>
  )
}

export default SidebarWidthToggle
