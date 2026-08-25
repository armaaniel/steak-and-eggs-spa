import { resetConsumer } from './consumer'

const domain: string = import.meta.env.VITE_API

const apiFetch = async (path: string, config?: RequestInit): Promise<Response | null> => {
	const token = localStorage.getItem('authToken')
	const headers = new Headers(config?.headers)
	if (token) headers.set('authToken', token)
	
	const response = await fetch(`${domain}${path}`, { ...config, headers })
	
	if (response.status === 401) {
		localStorage.removeItem('authToken')
		localStorage.removeItem('username')
		resetConsumer()
		window.location.href = '/login'
		return null
	}
	
	return response
	
}

export default apiFetch
