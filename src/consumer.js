import { createConsumer } from "@rails/actioncable"

const API = import.meta.env.VITE_API || 'http://localhost:3000'
const WS = API.replace('https://', 'wss://').replace('http://', 'ws://')

let globalConsumer = null

export const getConsumer = () => {
	if (!globalConsumer) {
		const token = localStorage.getItem('authToken')
		globalConsumer = createConsumer(`ws://localhost:3000/cable?token=${token}`)
		}
	return globalConsumer
}

export const resetConsumer = () => {
	if (globalConsumer) {
		globalConsumer.disconnect()
		globalConsumer = null
	}
}
	
	