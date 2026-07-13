interface Props {
  currentPage: number
  totalPages: number
  onNext: () => void
  onPrev: () => void
  className?: string
}

const PaginationControls = ({ currentPage, totalPages, onNext, onPrev, className = 'pagination-container' }: Props) => {
  return (
    <div className={className}>
      <button className="page-button" onClick={onPrev} disabled={currentPage === 1}>Previous</button>
      <span className="page-span">Page {currentPage} of {totalPages}</span>
      <button className="page-button" onClick={onNext} disabled={currentPage === totalPages}>Next</button>
    </div>
  )
}

export default PaginationControls
