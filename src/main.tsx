import { createRoot } from 'react-dom/client'
import { ApolloProvider } from '@apollo/client'
import client from './apolloClient.ts'
import App from './App.tsx'
import './stylesheets/application.css'

const root = createRoot(document.body)
root.render(
  <ApolloProvider client={client}>
    <App />
  </ApolloProvider>,
)
