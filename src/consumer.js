import { createConsumer } from "@rails/actioncable"

const token = localStorage.getItem('authToken')

export default createConsumer(`ws://localhost:3000/cable?token=${token}`)