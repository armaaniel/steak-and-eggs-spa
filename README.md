# Steak & Eggs

Frontend for [steakneggs.app](https://steakneggs.app/) — a trading simulator with streaming market data.

Backend repo: [steak-and-eggs](https://github.com/armaaniel/steak-and-eggs)

## Architecture

- React/TypeScript frontend subscribes to real-time price updates via a single WebSocket connection
- Graceful loading states across all data fetching and page transitions
- All API calls set meaningful fallback values in the event of network failures
- User inputs are validated, disabling submission until inputs are valid
- Derived values calculate live as prices stream in
- Debounced search
- Multi-step buy/sell order flow with confirmation and order receipt

---

## Deep Dive

### WebSocket Management

The client shares a single WebSocket connection for all real-time price updates across components. It subscribes to updates for the current symbol on the stock page, or for all held positions on the home page. Subscriptions are cleaned up on unmount.

### Loading States

Content visibility is gated behind data fetch resolution. Elements render at zero opacity and fade in once their data arrives.

### Error Handling

The app degrades gracefully on network failures, setting meaningful fallback values on every failed fetch. 401 responses clear the stored auth token and redirect to login.

### Validations

User inputs are validated, disabling submission until inputs are valid. Inputs are formatted as currency with max-length caps where applicable.

### Reusable Components

`TraceTable` is a generic table component that accepts a columns configuration — multiple views pass in their own columns and render functions. Sorting, pagination, empty states, and error states are handled internally.

Login and signup share a single `AuthForm` component that adapts based on the current route.

### Derived Values

As prices stream in, the positions table calculates P&L and daily price change. The user's portfolio value recalculates client-side every 5 seconds. Estimated value on buy and sell orders update in real time as the user types.

## Tech Stack

React · TypeScript · ActionCable · Vercel
