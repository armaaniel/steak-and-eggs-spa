import { createConsumer } from "@rails/actioncable"

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
	
	