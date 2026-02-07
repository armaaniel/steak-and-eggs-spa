# Steak & Eggs

Frontend for [steakneggs.app](https://steakneggs.app/) — a trading simulator with streaming market data.

Backend repo: [steak-and-eggs](https://github.com/armaaniel/steak-and-eggs)

## Architecture

- React/TypeScript frontend subscribes to ActionCable channels via a single WebSocket connection for real-time price updates
- Portfolio value recalculates live as prices stream in, throttled to prevent excessive re-renders
- Graceful loading states across all data fetching and page transitions
- All API calls return graceful fallbacks on failure so the UI never crashes
- User inputs validate against available balance and share counts, disabling submission until valid
- Debounced search with cached results from Redis on the backend
- Multi-step buy/sell order flow with confirmation and order receipt

---

## Deep Dive

### Real-Time Price Updates

Prices update in real-time across the positions table and stock pages via a single Websocket connection. The positions table calculates unrealized P&L in both dollar value and percentage as prices stream in, color-coded to reflect gains and losses.

### Portfolio Recalculation

As prices stream in, the users portfolio's value recalculates client-side by reducing the latest prices of all their positions alongside their cash balance. This is throttled to once every 5 seconds to avoid excessive re-renders while still feeling live.

### Loading States

Loading states are managed across all data fetching and page transitions so the UI gracefully loads content in.

### Error Handling

Every fetch call catches failures and sets fallback state so the UI always renders something usable.

### Validations

User inputs validate against available balance on buys and withdrawals, and available shares on sells, disabling submission until inputs are valid. Quantity and amount inputs are formatted and capped, and estimated cost updates live as the user types.

## Tech Stack

React · TypeScript · ActionCable · Vercel
