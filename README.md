# Steak & Eggs

Frontend for [steakneggs.app](https://steakneggs.app/), a paper-trading app with streaming market data, and for [DataCat](https://steakneggs.app/datacat), the monitoring dashboard built into it.

**Try it:** open [steakneggs.app](https://steakneggs.app/) and press **Try Demo** for an account with $100k, no sign-up needed. DataCat is public.

Backend repo: [steak-and-eggs](https://github.com/armaaniel/steak-and-eggs)

Mobile app: [steak-and-eggs-mobile](https://github.com/armaaniel/steak-and-eggs-mobile)

Price ingestion: [steak-and-eggs-ingester](https://github.com/armaaniel/steak-and-eggs-ingester)

## Highlights

- **DataCat**, a monitoring dashboard for the whole system. It answers four questions: is the app up, is it fast, why not when it isn't, and how much load it can take.
- **Every chart is hand-built** on `d3-scale` and `d3-shape`, with React rendering the SVG. There's no chart library.
- **A live price chart** that redraws at 60 fps while something is moving and 30 fps when nothing is, so it stays smooth without burning frames.
- **Charts morph between ranges** without the line sliding sideways or snapping at the end, even when the two ranges have very different point counts.
- **One WebSocket** carries every live price in the app.
- **Every piece of state has one owner.** The stock page owns the live price and passes it down, so the header, the chart, your position and the order form always agree.

---

## Deep Dive

### DataCat

Each page answers one question, and the data behind it comes from the [backend](https://github.com/armaaniel/steak-and-eggs) over GraphQL (Apollo Client).

| Question | Page | What it shows |
|---|---|---|
| Is it up? | Uptime | A canary walks a full user journey every 5 minutes, from sign-up to deleting the account. It's tracked against a 99.5% SLO over 30 days, with an error budget, and you can open any run to see its requests. |
| Is it fast? | Overview, Routes, Endpoint | p50, p95 and p99 latency and requests per time bucket, for the whole API or one route. A scatter plots each request. You can open a single trace to see each Redis, Postgres and Polygon call inside it. |
| Why not, when it isn't? | Dependencies, Resources, Ingester | A map of the load balancer, Rails, Valkey, Postgres, the ingester and Polygon, with live status and how each is set up. CloudWatch CPU and memory per resource. The ingester's state timeline, throughput and lag. |
| How much can it take? | Load runs (HTTP and WebSocket) | k6's client timings joined to the server's traces by request ID, next to per-second CPU. That join is how I found the ceiling: about 310 requests a second on a quarter of a vCPU. |

**Linked charts.** On the Overview, the latency chart and the requests chart share one hover. Clicking a requests bar opens that bucket's traces and pins the latency tooltip to the same bucket. The rule is that an open bucket always comes with a pin. Clicking the bar again, clicking anywhere else on either chart, pressing Escape or changing the range clears both together. That way, the two charts never disagree about what's selected.

**Big lists stay small.** An endpoint's trace list is capped at 1,000 rows. When the list is complete, sorting and filtering happen in the browser. When it's capped, clicking a bar or choosing a filter fetches exactly that slice from the server, so the scatter, bars and table always show the same requests.

**Queries live next to the component that runs them.** There are no shared fragments or query hooks, so every query sits in the same file as the UI that shows its data.

### Charts

The scales come from `d3-scale` and the curves (`curveMonotoneX`) from `d3-shape`. Everything else is React and SVG: axes, labels, tooltips, scrubbing and animation.

**Range morphs** (`useMorphingPoints`). Switching from 1D to 5Y means going from one line to a line with a different number of points. Blending point by point makes the line slide sideways. Instead, both lines are read at the same x positions: every real point, with extra columns filled in every 1.5 px. The heights are read along the drawn curve itself, not between the raw points. Each column's height is blended with CSS-style easing. Because the heights come from the curve, the last frame matches the new line to within about 0.6 px, so nothing snaps when the morph ends. The date labels fade out and back in on their own timing.

**The Live chart** (`LiveChart`):
- Polygon's feed is 15 minutes delayed and arrives as one bar for each second a stock trades. The chart draws a 60-second window that ends 15 minutes and 2 seconds ago, so every bar has arrived before its time reaches the head of the line. As a result the line moves continuously instead of jumping once a second.
- New prices glide in over 400 ms. When a stock goes quiet for more than 1.5 s, the line holds flat, because a stock that didn't trade didn't move.
- The y-range follows the visible window. When it changes, the old labels fade out before the new ones fade in.
- A `requestAnimationFrame` loop draws at 60 fps while a price is gliding or a morph is running, and drops to 30 fps otherwise.
- On Stocks, it's seeded from `/stocks/:symbol/livedata`, so it doesn't start empty. On Home, it starts flat at the portfolio's current value and builds from there.

**Handoffs.** Switching between Live and a history range morphs from the line already on screen. The outgoing chart hands over its on-screen line and labels, so the next chart never starts blank, even while its data is still loading.

Morphs and label swaps respect `prefers-reduced-motion`.

### Live Prices

The app opens one ActionCable connection and adds a subscription per symbol: the current symbol on a stock page, or every holding on Home. Subscriptions are removed on unmount.

On Home's Live range, the portfolio value is recomputed as prices stream in. Holdings' prices land spread across each second, so showing every change makes the number jitter. A fixed throttle looks mechanical instead. `useSteppedValue` shows a change right away once it's at least 0.002% of the invested value, but no more often than every 400 ms. Smaller drift catches up after 3 seconds.

### Where State Lives

Every piece of state has one owner. Here's where each kind lives, and why there:

| State | Lives in | Why there |
|---|---|---|
| Who's logged in | `AuthContext` (`lib/auth.tsx`), with the token in `localStorage` | the navbar, pages and forms all need it, and it survives a reload |
| Trading data | `useApi`, in the page that needs it | each page owns its fetches; a response that arrives after a newer request is ignored, so switching symbols quickly can't show the wrong stock |
| DataCat data | Apollo's cache (`useQuery`) | `network-only` by default, because monitoring data should be fresh; buckets that have finished switch to `cache-first`, since they can't change |
| Live prices | `usePriceSubscriptions`, in the page (Stocks, Home) | one subscription per symbol, all on one shared socket (`getConsumer`) |
| Chart range | `sessionStorage` (`useStoredRange`) | survives navigating away and reloading, without leaking into other tabs |
| Symbol, endpoint | the URL (`useParams`) | links can be shared and the back button works |
| DataCat range and detail panel | the `DCList` layout, passed down through `Outlet` context | every DataCat page shares them; the detail panel is one value with a `kind` (`'trace'`, `'cable'`, `'dependency'`, …), not one nullable state per panel |
| Chart hover and pin | the wrapper around a group of charts | charts stacked together move as one |

**Data down, events up.** The stock page owns the price. Its children get it as props and report back through callbacks:

```
Stocks                      owns: the live price, the hovered point, the range
 ├─ header                  ← the price, or the hovered point while you scrub
 ├─ LiveChart / Chart       ← the price or chart data      → onHover(point)
 ├─ PositionTable           ← the price
 └─ BuySell                 ← the price and your balance   → onComplete() refetches your position
```

No two components keep their own copy of the price, so the header, the chart, your position and the order form always agree.

The page also holds a ref to the line currently on screen, which is what makes the Handoffs above work.

### How the Code Is Organized

The rule: extract code when it removes real repetition or gives shared behavior one home, not because a file is long.

- **Components for repeated markup.** `Modal` adds Escape-to-close and dialog semantics once for every modal. `Select` replaced five hand-written dropdowns.
- **Hooks only for stateful behavior,** for example `usePriceSubscriptions`, `useMorphingPoints`, `useSteppedValue` and `useClickOutside`. Stateless logic stays in plain functions.

**One component, many places:**

| Component                 | Used for                                                                             | What changes between uses                                                                 |
| ------------------------- | ------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| `TimeSeriesChart`         | load runs (4 charts), cable runs (4), the ingester (3), and one per row on Resources | the lines, the axis, which tooltip and toggles are on                                     |
| `BucketBarChart`          | the requests chart and the uptime chart                                              | the bars and series; `pinSelected` holds the legend on a clicked bar                      |
| `LiveChart`               | a stock's price, and your whole portfolio                                            | `seriesKey`, `seedPath` (`null` for the portfolio, which has no history to load), `price` |
| `TraceTable`              | traces, an endpoint, connections, the ingester                                       | a column config with render functions; sorting, paging and empty states are built in      |
| `AuthForm`, `FundsButton` | login and signup, deposit and withdraw                                               | a `mode` prop                                                                             |

### The Trading App

- A multi-step buy and sell flow with confirmation and an order receipt. Estimated cost updates as you type.
- P&L and daily change recalculate per position as prices stream in.
- JWT auth is sent in the `authToken` header. A 401 clears the token and sends you to login.
- Every fetch has a fallback value, so a failed call renders placeholders instead of breaking the page. Content fades in once its data arrives.
- Light and dark themes.

## Running Locally

Needs the [Rails API](https://github.com/armaaniel/steak-and-eggs) running.

```sh
npm install
VITE_API=http://localhost:3000 npm run dev
```

## Tech Stack

React 19 · TypeScript · Vite · React Router · Apollo Client (GraphQL) · ActionCable · d3-scale · d3-shape · Vercel
