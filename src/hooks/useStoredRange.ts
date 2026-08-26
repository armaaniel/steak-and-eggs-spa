import { useState } from 'react'

const useStoredRange = <T extends string>(key:string, allowed:readonly T[], fallback:T) => {
	
	const [range, setRange] = useState<T>(() => {
		try {
			const stored = sessionStorage.getItem(key)
			return allowed.includes(stored as T) ? stored as T : fallback
		} catch {
			return fallback
		}
	})
	
	const select = (next:T) => {
		setRange(next)
		try {
			sessionStorage.setItem(key, next)
		} catch {
			return
		}
	}
	
	return [range, select] as const
}

export default useStoredRange
