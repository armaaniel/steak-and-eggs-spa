import { createRoot } from 'react-dom/client'
import { ApolloProvider } from '@apollo/client'
import client from './lib/apolloClient.ts'
import App from './App.tsx'
import './stylesheets/application.css'
import './stylesheets/buttons.css'
import './stylesheets/navbar.css'

const root = createRoot(document.body)
root.render(
  <ApolloProvider client={client}>
    <App />
  </ApolloProvider>,
)
