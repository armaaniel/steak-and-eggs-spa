import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'

export default function useTryDemo(destination = '/home') {
	const navigate = useNavigate()
	const { setToken } = useAuth()
	const [isSubmitting, setIsSubmitting] = useState(false)
	const [error, setError] = useState<string | null>(null)

	async function tryDemo() {
		setIsSubmitting(true)
		setError(null)
		try {
			const response = await fetch(`${import.meta.env.VITE_API}/demo`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
			})
			if (response.ok) {
				const data = await response.json()
				localStorage.setItem('authToken', data.token)
				localStorage.setItem('username', data.username)
				setToken(data.token)
				navigate(destination)
			} else {
				const errorData = await response.json()
				setError(errorData.error)
			}
		} catch {
			setError('Something went wrong, please try again')
		} finally {
			setIsSubmitting(false)
		}
	}

	return { tryDemo, isSubmitting, error }
}
