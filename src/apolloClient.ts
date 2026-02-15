import { ApolloClient, InMemoryCache, createHttpLink } from '@apollo/client';

const httpLink = createHttpLink({
  uri: 'https://steakneggs.art/graphql',
});

const client = new ApolloClient({
  link: httpLink,
  cache: new InMemoryCache({ addTypename: false }),
  defaultOptions: {
    query: {
      fetchPolicy: 'network-only',
    },
    watchQuery: {
      fetchPolicy: 'network-only',
    },
  },
});

export default client;