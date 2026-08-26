import { useState, useEffect, useRef } from 'react'
import apiFetch from '../lib/apiFetch'

function useApi<T>(path: string | null, fallback: T) {
	const [data, setData] = useState<T | null>(null)
	const [error, setError] = useState<string | null>(null)
	const latestRequest = useRef(0)
	
	const getData = async () => {
		const request = ++latestRequest.current
		
		if (!path) {
			setData(null)
			setError(null)
			return
		}
		setError(null)
		
		try {
			const response = await apiFetch(path)
			if (!response) return
			if (request !== latestRequest.current) return
			
			if (response.ok) {
				const json = await response.json()
				if (request !== latestRequest.current) return
				setData(json)
			} else {
				setData(fallback)
				setError('Something went wrong')
			}
			
		} catch {
			if (request !== latestRequest.current) return
			setData(fallback)
			setError('Something went wrong')
		}
	}
	
	useEffect(() => { getData() }, [path])
	
	return {data, error, getData, setData }
	
}

export default useApi

