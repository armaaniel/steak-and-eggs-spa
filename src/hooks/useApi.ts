import { useState, useEffect, useRef } from 'react'
import apiFetch from '../lib/apiFetch'

function useApi<T>(path: string | null, fallback: T) {
	const [data, setData] = useState<T | null>(null)
	const [error, setError] = useState<string | null>(null)
	const [loadedPath, setLoadedPath] = useState<string | null>(null)
	const latestRequest = useRef(0)
	
	const getData = async () => {
		const request = ++latestRequest.current
		
		if (!path) {
			setData(null)
			setError(null)
			setLoadedPath(null)
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
				setLoadedPath(path)
			} else {
				setData(fallback)
				setLoadedPath(path)
				setError('Something went wrong')
			}
			
		} catch {
			if (request !== latestRequest.current) return
			setData(fallback)
			setLoadedPath(path)
			setError('Something went wrong')
		}
	}
	
	useEffect(() => { getData() }, [path])
	
	return {data, error, getData, setData, loadedPath }
	
}

export default useApi

