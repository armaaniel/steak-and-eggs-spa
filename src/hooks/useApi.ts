import { useState, useEffect } from 'react'
import apiFetch from '../lib/apiFetch'

function useApi<T>(path: string | null, fallback: T) {
	const [data, setData] = useState<T | null>(null)
	const [error, setError] = useState<string | null>(null)
	
	const getData = async () => {
		if (!path) {
			setData(null)
			setError(null)
			return
		}
		setError(null)
		
		try {
			const response = await apiFetch(path)
			if (!response) return
			if (response.ok) {
				setData(await response.json())
			} else {
				setData(fallback)
				setError('Something went wrong')
			}
			
		} catch {
			setData(fallback)
			setError('Something went wrong')
		}
	}
	
	useEffect(() => { getData() }, [path])
	
	return {data, error, getData, setData }
	
}

export default useApi

