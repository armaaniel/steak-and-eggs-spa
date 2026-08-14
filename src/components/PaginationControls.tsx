import '../stylesheets/pagination.css'

interface Props {
  currentPage: number
  totalPages: number
  onNext: () => void
  onPrev: () => void
  className?: string
}

const PaginationControls = ({ currentPage, totalPages, onNext, onPrev, className }: Props) => {
  const classes = className ? `pagination-container ${className}` : 'pagination-container'

  return (
    <div className={classes}>
      <button className="page-button" onClick={onPrev} disabled={currentPage === 1}>Previous</button>
      <span className="page-span">Page {currentPage} of {totalPages}</span>
      <button className="page-button" onClick={onNext} disabled={currentPage === totalPages}>Next</button>
    </div>
  )
}

export default PaginationControls
