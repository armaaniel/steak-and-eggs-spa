import { useEffect, useId } from 'react'

interface Props {
  title: string
  onClose: () => void
  children: React.ReactNode
}

const Modal = ({ title, onClose, children }: Props) => {
  const titleId = useId()

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby={titleId} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 id={titleId} className="modal-title">{title}</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">&#x2715;</button>
        </div>
        {children}
      </div>
    </div>
  )
}

export default Modal
