# Steak & Eggs Refactor — Context Document

## Background

Armaan is an Ops Associate at Wealthsimple pursuing an internal move into software engineering. He built Steak & Eggs — a full-stack trading simulator with a Rails 8 API backend, React/TypeScript SPA frontend, React Native mobile app, and a standalone price ingester. The backend is deployed on AWS (ECS Fargate, RDS, ElastiCache, ALB, EventBridge) with Terraform. It has a 180-example RSpec test suite, a custom APM system (DataCat), three-tier caching, pessimistic locking with consistent lock ordering, and graceful degradation throughout.

He applied for an internal SWE internship at Wealthsimple and was rejected. The interview had two rounds: pair programming and systems design.

## Rejection Feedback (from recruiter Eileen)

### Strengths
- Clear communication throughout
- Strong self-direction in learning new technical areas
- Good adaptability — applied learnings from earlier stages to later ones
- Completed the first part of the exercise well ahead of pace
- Solid technical proficiency and sound judgment overall

### Areas for Growth (what each actually means)

**1. Debugging (pair programming round).** They gave him a hint — the bug was a string-vs-date comparison — and it took too long to resolve. The gap isn't Ruby knowledge, it's not having a systematic debugging reflex. The fix: when something compares wrong, first move is always inspect the types (`.class`, `binding.irb`, `puts thing.inspect`), not stare at the values.

**2. Testing practices, design patterns, solution design (pair programming round).** This is about being able to articulate the *shape* of a solution while building it. Naming patterns ("service object", "strategy pattern"), thinking about testing as part of design ("I'd test the happy path, the nil edge case, and the API-down case"), not just writing tests after the fact.

**3. Code maintainability / interface design (systems design round).** This is where it fell apart. He prepared 11 backend/infra topics in depth but didn't prepare frontend at all. The interviewer was a frontend engineer. He blanked when asked about component reusability and how data flows between components.

### The Real Gap (Eileen's direct advice)
"The main things we look for is whether you've interacted with large systems and worked collaboratively with others." The biggest gap isn't technical skill — it's that every project is solo work. No PRs, no code review, no shared ownership.

## Three-Track Plan (6 months)

**Track 1: Frontend refactor.** Refactor the SPA to demonstrate growth in the exact areas the interview exposed. Be able to speak to *why* the original design was weak, what changed, and what the tradeoffs are.

**Track 2: Collaborative experience.** Either contribute to an open source project with real PRs that get reviewed, or find someone to build something with. Actual collaboration, not solo work.

**Track 3: Internal visibility.** Get an engineering warm intro through his manager. Get code review on the internal tools he's built (reconciliation dashboard, Fundserv automation). Join internal engineering Slack channels.

## The Core Frontend Gap

He thinks about code in terms of features, not abstractions. Each page was built by asking "what does this page need?" and writing everything top-to-bottom in one file. The instinct to look *across* pages and ask "what's the same shape here?" hasn't developed yet on the frontend. He already does this on the backend (RedisService, CacheService, the service layer) — just hasn't applied the same thinking to React.

Specific problems identified in the SPA:
- Auth-checked fetch duplicated ~15 times across every page and component
- No data-fetching abstraction — every page manually manages useState + useEffect + try/catch
- BuySell is a 250-line monolith managing a 3-step wizard
- ActionCable subscription setup duplicated between Home and Stocks
- Pagination logic inlined instead of extracted
- Cross-cutting concerns (auth, fetching, error states) inlined everywhere

## Abstractions Built So Far

### apiFetch (plain function, not a hook)
Lives at `src/apiFetch.ts`. The app's configured API client. Owns the base URL, attaches auth token from localStorage, handles 401 with a hard redirect.

```typescript
import { resetConsumer } from './consumer'
const domain: string = import.meta.env.VITE_API
const apiFetch = async (path: string, config?: RequestInit): Promise<Response | null> => {
	const token = localStorage.getItem('authToken')
	const response = await fetch(`${domain}${path}`, {
		...config,
		headers: {
			...config?.headers,
			authToken: token ?? ''
		}
	})
	if (response.status === 401) {
		localStorage.removeItem('authToken')
		resetConsumer()
		window.location.href = '/login'
		return null
	}
	return response
}
export default apiFetch
```

Key decisions:
- **Not a hook** — originally was `useAuthFetch` with useState for token, then `useClient`. Once we moved to ProtectedRoute + hard redirect, there was no React state to manage, so the hook wrapper was pointless.
- **Hard redirect (`window.location.href`) over React context** — AuthContext + ProtectedRoute was considered. It's architecturally cleaner (one source of truth, reactive) but adds a provider wrapping the whole app, context boilerplate, and you end up maintaining both context state and localStorage in sync. For an app with four authenticated pages, `window.location.href = '/login'` does the same job in one line. Full page reload on session death is actually desirable — kills all stale state.
- **No `if (!token)` guard** — ProtectedRoute prevents unauthenticated users from reaching pages that call apiFetch. The 401 handler catches mid-session expiry. The guard would be defense-in-depth that doesn't change any outcome.
- **No try/catch** — apiFetch handles auth. Network errors bubble up to the caller (useApi's getData or BuySell's handleSubmit), which knows how to handle them (set fallback data, show error message). Each layer handles what it knows about.
- **`config?: RequestInit`** — optional second argument for POSTs. GETs don't pass it. The spread pattern (`...config`, `...config?.headers`) merges caller's headers with the auth token without overwriting either. Duplicate `headers` key — last one wins in JS objects.

### useApi (React hook)
Lives at `src/hooks/useApi.ts`. Wraps apiFetch with React state management for the GET-on-mount pattern.

```typescript
import { useState, useEffect } from 'react'
import apiFetch from '../apiFetch'
function useApi<T>(path: string, fallback: T) {
	const [data, setData] = useState<T | null>(null)
	const [error, setError] = useState<string | null>(null)
	const getData = async () => {
		setError(null)
		try {
			const response = await apiFetch(path)
			if (!response) return
			if (response.ok) {
				setData(await response.json())
			} else {
				setData(fallback)
				setError('Something went wrong')
			}
		} catch {
			setData(fallback)
			setError('Something went wrong')
		}
	}
	useEffect(() => { getData() }, [path])
	return { data, error, getData }
}
export default useApi
```

Key decisions:
- **Two arguments**: `path` (endpoint) and `fallback` (safe shape for error/failure cases — same values that were already in catch blocks).
- **Three returns**: `data`, `error`, `getData`. `getData` is exposed so components like BuySell can trigger a refetch after a trade (e.g., `getUserData` passed as prop).
- **No loading state** — removed because existing pages check `data ? 'loaded' : ''` for CSS transitions. Data starts null, once set (success or fallback) the page transitions. No need for a separate boolean.
- **`<T>` generic** — lets each call site specify its type: `useApi<ChartData[]>(...)`, `useApi<CompanyData>(...)`. The hook internally types data as `T | null`.
- **Re-fetches on path change** — `[path]` in useEffect dependency array. When user navigates from `/stocks/AAPL` to `/stocks/GOOG`, path changes, fetch fires again.
- **POSTs don't use useApi** — they use apiFetch directly. useApi is for "fetch data on mount." POSTs are triggered by user actions with different state management needs.

### ProtectedRoute (layout component)
Wraps all authenticated routes. Checks localStorage for token, redirects to login if missing. Replaces the `if (!token) return <Navigate to="/login" />` check duplicated in every page.

```typescript
import { Navigate, Outlet } from 'react-router-dom'
function ProtectedRoute() {
  const token = localStorage.getItem('authToken')
  if (!token) return <Navigate to="/login" />
  return <Outlet />
}
```

Router structure:
```
<Route element={<ProtectedRoute />}>
  <Route path="/home" element={<Home />} />
  <Route path="/activity" element={<Activity />} />
  <Route path="/stocks/:symbol" element={<Stocks />} />
  {/* DataCat routes */}
</Route>
```

Backend analogy: `before_action(:verify_token)` in ApplicationController. Same concept — guard at the routing level, not in every page.

## Design Decisions Log

**Parallel fetches, not Promise.all** — Each useApi call creates an independent useEffect. All fire on mount simultaneously. Fast endpoints render first (ticker name from cache), slow ones fill in later (company data from Polygon). Progressive rendering is better UX than waiting for the slowest. Independent failure domains — one failed fetch doesn't block others. This matches the backend design where each endpoint has different cache TTLs.

**No frontend caching** — Backend caches aggressively in Redis (streaming prices, 24h chart data, 3-day company data, 1-month ticker metadata). Frontend fetches hit Redis most of the time. App has simple navigation patterns — no complex tab-switching or multi-component same-data scenarios. Would reach for TanStack Query if needed. Interview answer: "My backend handles caching with three freshness models. The frontend doesn't cache because the app's navigation patterns don't warrant it. If I needed client-side caching I'd use TanStack Query for stale-while-revalidate and request deduplication."

**Built useApi instead of using TanStack Query** — TanStack solves the same problem but it's a black box. Building it yourself means understanding *exactly* what it does. Interview answer is "I built my own to learn the pattern, and if the app grew I'd migrate to TanStack Query for stale-while-revalidate, request deduplication, and cache invalidation."

**window.location.href over React Router navigate for 401** — Full page reload is fine for session death. Happens rarely (only on token expiry). Kills all stale in-memory state, which is actually desired. Avoids needing AuthContext + Provider + useContext just to make ProtectedRoute reactive to mid-session token changes.

**tickerData stays as manual apiFetch, not useApi** — 404 response means show a completely different page (NotFoundTwo), not just fallback data. That special behavior doesn't fit useApi's pattern.

**price/open stay as manual useState + apiFetch** — Two data sources write to price: the initial REST fetch and the WebSocket subscription. useApi owns its own state internally, so the WebSocket can't write to it. Keeping useState for price lets both sources share the same state.

**usePrice hook deferred** — Considered extracting price fetch + WebSocket into a `usePrice(symbol)` hook. Decided against it for now because it's only used in Stocks.tsx — that's relocation, not abstraction. Home.tsx has a different shape (multiple symbols, a price map). Would need a separate `usePrices` hook. Two hooks each used once isn't reuse. Extract if a third consumer appears.

## Current State of Stocks.tsx

```typescript
function Stocks() {
  let { symbol } = useParams()
  const navigate = useNavigate()
  const exchangeNames = { XNAS: 'NASDAQ', BATS: 'BATS', XASE: 'NYSE American', XNYS: 'NYSE', ARCX: 'NYSE Arca' }

  const [tickerData, setTickerData] = useState<TickerData | null>(null)
  const [tickerNotFound, setTickerNotFound] = useState(false)
  const [price, setPrice] = useState<Price>(null)
  const [open, setOpen] = useState<Open>(null)
  const [asOf, setAsOf] = useState(new Date(Date.now() - 15 * 60 * 1000))
  const [imageLoaded, setImageLoaded] = useState(false)

  const percentChange = toPercent(price, open)
  const isPositive = Boolean(percentChange && percentChange.startsWith('+'))

  useEffect(() => {
    if (symbol && symbol !== symbol.toUpperCase()) {
      symbol = symbol.toUpperCase()
      navigate(`/stocks/${symbol}`, { replace: true })
      return
    }
  }, [symbol])

  const { data: userData, getData: getUserData } = useApi<UserData>(
    `/stocks/${symbol}/userdata`, { balance: 'N/A' })

  useEffect(() => { /* manual tickerData fetch via apiFetch — 404 handling */ }, [symbol])

  const { data: chartData } = useApi<ChartData[]>(
    `/stocks/${symbol}/chartdata`,
    [{ date: new Date().toLocaleDateString(), value: 0 },
     { date: new Date().toLocaleDateString(), value: 0 }])

  const { data: companyData } = useApi<CompanyData>(
    `/stocks/${symbol}/companydata`, { market_cap: 'N/A', description: 'N/A' })

  const { data: marketData } = useApi<MarketData>(
    `/stocks/${symbol}/marketdata`,
    { open: 'N/A', high: 'N/A', low: 'N/A', volume: 'N/A' })

  useEffect(() => { /* manual stockprice fetch via apiFetch — dual write with WS */ }, [symbol])
  useEffect(() => { /* WebSocket subscription for live price */ }, [symbol])
  useEffect(() => { /* asOf timestamp interval */ }, [])

  // tickerNotFound early return
  // main render
}
```

## What's Left To Do

### Refactor (Track 1)
- [x] apiFetch extracted
- [x] useApi extracted
- [x] Stocks.tsx partially refactored (userData, chartData, companyData, marketData on useApi; tickerData and stockprice on manual apiFetch)
- [x] ProtectedRoute implemented and wired into router
- [x] Remove token state and Navigate checks from all pages
- [x] Home.tsx refactor to useApi
- [x] Activity.tsx refactor to useApi
- [x] Searchbar refactor to use apiFetch
- [x] BuySell refactor to use apiFetch for POST
- [x] FundsButton refactor to use apiFetch for POST
- [x] BuySell decomposition (OrderForm, OrderConfirm, OrderResult components)
- [x] Pagination extraction (shared between Activity and DataCat views)
- [x] Decide on usePrice after seeing final Stocks.tsx shape
- [ ] Port patterns to React Native mobile app (same hooks, quick job once SPA is done)

### Collaborative Experience (Track 2)
- [ ] Find an open source project or a person to build with
- [ ] Get PR history with real code review

### Internal Visibility (Track 3)
- [ ] Ask manager for warm intro to engineering
- [ ] Get code review on reconciliation dashboard or Fundserv tool
- [ ] Join internal engineering channels

## Key Vocabulary for Interviews
- **Abstraction** — noticing what's repeated or what's infrastructure vs. feature-specific, pulling the common shape out
- **Separation of concerns** — each piece has one job (apiFetch handles auth, useApi handles fetch lifecycle, page components handle layout)
- **Composition** — building complex behavior from simple pieces (useApi uses apiFetch internally, Stocks.tsx composes useApi + usePrice + BuySell)
- **DRY at the behavior level** — not character-level deduplication, but recognizing when the same *pattern* is repeated (fifteen auth-checked fetches is a missing abstraction)
- **Progressive rendering** — independent fetches resolve independently, fast data appears first
- **Cross-cutting concern** — auth handling, error handling — things that apply everywhere and should be centralized
