interface Props {
  wide: boolean
  onToggle: () => void
}

const SidebarWidthToggle = ({ wide, onToggle }: Props) => {
  let label = 'Widen sidebar'
  let arrowClassName = 'dc-sidebar-edge-arrow'

  if (wide) {
    label = 'Narrow sidebar'
    arrowClassName = 'dc-sidebar-edge-arrow wide'
  }

  return (
    <button type="button" className="dc-sidebar-edge" onClick={onToggle} aria-label={label}>
      <span className={arrowClassName}>{'>'}</span>
    </button>
  )
}

export default SidebarWidthToggle
