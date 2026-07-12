import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function useTryDemo() {
	const navigate = useNavigate()
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
				navigate('/home')
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
