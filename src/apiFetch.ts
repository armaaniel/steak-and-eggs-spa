import { resetConsumer } from './consumer'

const domain: string = import.meta.env.VITE_API

const apiFetch = async (path: string, config?: RequestInit): Promise<Response | null> => {
	const token = localStorage.getItem('authToken')
	
	const response = await fetch(`${domain}${path}`, {
		...config,
		headers: {
			...config?.headers,
			authToken: token ?? ''
		}
	})
	
	if (response.status === 401) {
		localStorage.removeItem('authToken')
		resetConsumer()
		window.location.href = '/login'
		return null
	}
	
	return response
	
}

export default apiFetch
