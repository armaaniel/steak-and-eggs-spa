import { useEffect } from 'react'
import type { RefObject } from 'react'

const useClickOutside = (ref: RefObject<HTMLElement | null>, onOutside: () => void, active = true) => {
  useEffect(() => {
    if (!active) return

    const handleMouseDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onOutside()
    }

    document.addEventListener('mousedown', handleMouseDown)
    return () => document.removeEventListener('mousedown', handleMouseDown)
  }, [ref, onOutside, active])
}

export default useClickOutside
