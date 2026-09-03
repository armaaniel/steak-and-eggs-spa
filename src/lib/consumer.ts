import { createConsumer } from "@rails/actioncable"

const API: String = (import.meta.env.VITE_API || 'http://localhost:3000').replace(/\/$/, '')
const WS = API.replace('https://', 'wss://').replace('http://', 'ws://')

let globalConsumer: null | any = null

export const getConsumer = () => {
	if (!globalConsumer) {
		globalConsumer = createConsumer(`${WS}/cable`)
		}
	return globalConsumer
}

export const resetConsumer = () => {
	if (globalConsumer) {
		globalConsumer.disconnect()
		globalConsumer = null
	}
}
	
	