# Steak & Eggs — JSX / Markup Audit

A focused look at the *markup* quality of the SPA (separate from the data-layer refactor).
Line numbers are as of **2026-07-14** and will drift as files change — grep the quoted
snippet if a number looks off.

**Why this matters specifically:** the interview round that went badly was a frontend
engineer probing component reusability and data flow. Markup repetition and accessibility
are exactly what that lens catches first — cheap to fix, high signal.

Legend: 🔴 real defect · 🟡 repetition / smell · 🟢 minor / polish · ✅ done

---

## Patterns worth copying (the good)

These are the bar. When something below feels wrong, it's because it *doesn't* look like these.

- **`TraceTable` is column-driven** (`components/datacat/TraceTable.tsx`). It renders headers
  and cells from a `columns` array (`columns.map(col => <th>)`, `columns.map(col => <td>{col.render(row)}</td>)`).
  Markup that's really *data* gets rendered *from* data. Several spots below should look like this and don't.
- **The modals are clean and accessible** (`ChangePasswordModal`, `DeleteAccountModal`) —
  `aria-label` on the close button, `id`/`htmlFor` that actually match, `stopPropagation`
  on the overlay. That's the accessibility bar; other spots fall short of it.

---

## ✅ Already fixed (2026-07-14)

- **`TickerLogo` now owns its own fade + has `alt`.** The "has my image loaded?" concern
  moved out of `Stocks` (dropped `imageLoaded` state + wrapper div) and into `TickerLogo`
  itself, which now manages a local `loaded` boolean and applies its own `.ticker-logo`
  fade class. Result: `Stocks` got simpler, both position tables fade their logos for free,
  and every logo across the app now has `alt={`${symbol} logo`}`. This clears the
  "missing alt" defect below and the Stocks-vs-tables fade asymmetry in one move.

---

## Accessibility — real defects (highest value)

These are invisible today because the floating-label CSS trick (`placeholder=" "` + sibling
selector) still *looks* right, so nothing flagged them.

- 🔴 **`AuthForm` labels aren't associated with their inputs.** Inputs use
  `name="username"` / `name="password"` (`AuthForm.tsx:105,116`) but have **no `id`**, while
  the labels use `htmlFor="username"` / `htmlFor="password"` (`:110,121`). `htmlFor` points at
  an `id` that doesn't exist → clicking the label doesn't focus the field, and screen readers
  don't announce it. **Fix:** add matching `id` to each input. (The modals already do this right.)
- 🔴 **`Searchbar` has the same broken label.** Label `htmlFor="search"` (`Searchbar.tsx:91`)
  but the input has no `id="search"`. Same fix.
- 🔴 **"Try Demo" is a clickable `<span>`** (`AuthForm.tsx:82`), not a button — no keyboard
  focus, no Enter/Space activation. **Fix:** make it a `<button>` (style it flat if needed).
- 🔴 **Profile-menu trigger is an icon-only `<button>` with no accessible name**
  (`Navbar.tsx:67`) — a screen reader announces just "button." **Fix:** `aria-label="Account menu"`.
- 🟡 **`colSpan={7}` on an 8-column table** (`Activity.tsx:44,54`) — the empty/error row spans
  7 of 8 columns. Small visual bug, off by one. **Fix:** `colSpan={8}`.

---

## Habit #1 — duplicating an element to swap one word

Pervasive in `BuySell`. The ternary wraps the whole element when it only needs to wrap the word.

```jsx
// BuySell.tsx:187 — current
{isBuy ? <p>Market Buy {symbol}</p> : <p>Market Sell {symbol}</p>}

// better
<p>Market {isBuy ? 'Buy' : 'Sell'} {symbol}</p>
```

🟡 Same shape at `BuySell.tsx:129, 143, 159, 187, 201, 234, 287`.

Also note **inconsistency**: `:143` uses `currentState.action === 'buy'` while `isBuy` is
already defined at the top of the component. Pick one (`isBuy`).

🟡 **Byte-identical copy-paste:** the `bs-error-container` block at `BuySell.tsx:165-167` and
`:215-217` is the same markup twice. Lift into a local `<InsufficientBanner />` or a variable.

---

## Habit #2 — repeating a wrapper instead of rendering from data

- 🟡 **`PositionsTable` wraps every cell in its own `<Link>` — 5 identical links per row**
  (`PositionsTable.tsx:57,67,78,86,95`), all pointing at the same `/stocks/${symbol}`. Besides
  the repetition, that's 5 identical links in one row: a keyboard user tabs through all five,
  a screen reader reads "link" five times. **Fix:** make the row one navigable unit, or lift
  the single `Link`/`onClick` up so the cells aren't each a link.
- 🟡 **Stocks "Market Details" is 6 hand-written label/value blocks** (`Stocks.tsx:146-193`),
  each `<div><p class="data-name">X</p><p class="data-value ...">{Y}</p></div>` re-interpolating
  `marketData ? 'loaded' : ''` six times. This is data — render it from an array:

  ```jsx
  const details = [
    { label: 'Open',   value: toCurrency(marketData?.open) },
    { label: 'High',   value: toCurrency(marketData?.high) },
    { label: 'Low',    value: toCurrency(marketData?.low) },
    { label: 'Volume', value: toReadable(marketData?.volume) },
    { label: 'Currency', value: 'USD' },
    { label: 'Exchange', value: exchangeNames[tickerData?.exchange ?? ''] },
  ]
  // then map into the existing two-column layout
  ```

  Collapses ~30 lines and mirrors what `TraceTable` already does well.
- 🟡 **`BuySell`'s `bs-containers` label/value row is repeated ~10 times** — same candidate for
  a tiny local `<Row label={...} value={...} />`.

---

## Smaller stuff

- 🟡 **The three-`<tbody>` empty/error/data pattern** (`Activity.tsx:42,52,61` and
  `PositionsTable.tsx:27,37,46`) — two conditional tbodies plus the real one, copy-pasted
  between the two files. Valid HTML, but it's a repeated shape worth a shared `<TableState>` helper.
- 🟢 **`key={position.shares}` on a `<p>`** (`PositionTable.tsx:34`, `PositionsTable.tsx:70`) —
  using a data *value* as a `key` to force a remount (for a CSS re-trigger, presumably). It
  works but misuses `key`. If that's the intent, add a comment so nobody "fixes" it.
- 🟢 **Unnecessary fragments** wrapping a single `<main>` (`Stocks.tsx:108-109` → `:200`,
  `Activity.tsx:23-24`, `Home.tsx:~52`). Just `return <main>…</main>`.
- 🟢 **Redundant `onClick` in `Searchbar`** — `handleSelect` is on both the `<li>` and the
  `<Link>` inside it (`Searchbar.tsx:101,102`); the `<li>` one is redundant.

---

## Leave alone (so you don't over-refactor)

- The `${x ? 'loaded' : ''}` className convention — deliberate CSS-transition pattern, not a smell.
- Multiple `<tbody>` for table states is *valid* HTML; only worth touching for the dedup above,
  not because it's "wrong."

---

## Checklist

| # | Item | Type | File | Status |
|---|------|------|------|--------|
| 1 | `TickerLogo` self-fade + `alt` | a11y / structure | `TickerLogo.tsx` | ✅ done |
| 2 | `AuthForm` label `id`/`htmlFor` mismatch | 🔴 a11y | `AuthForm.tsx:105,110,116,121` | ✅ done |
| 3 | `Searchbar` label `id`/`htmlFor` mismatch | 🔴 a11y | `Searchbar.tsx:90,91` | ✅ done |
| 4 | "Try Demo" `<span>` → `<button>` | 🔴 a11y | `AuthForm.tsx:82` | todo |
| 5 | Profile trigger needs `aria-label` | 🔴 a11y | `Navbar.tsx:67` | todo |
| 6 | `colSpan={7}` → `{8}` | 🟡 bug | `Activity.tsx:44,54` | ✅ done |
| 7 | Text-swap ternaries → swap the word | 🟡 dup | `BuySell.tsx:129,143,159,187,201,234,287` | ✅ done |
| 8 | Duplicated `bs-error-container` block | 🟡 dup | `BuySell.tsx:165,215` | todo |
| 9 | `PositionsTable` 5 links/row | 🟡 dup / a11y | `PositionsTable.tsx:57,67,78,86,95` | todo |
| 10 | Market Details → render from array | 🟡 dup | `Stocks.tsx:146-193` | todo |
| 11 | `bs-containers` row → local component | 🟡 dup | `BuySell.tsx` | todo |
| 12 | Three-`<tbody>` state pattern → helper | 🟡 dup | `Activity.tsx`, `PositionsTable.tsx` | todo |
| 13 | `key={position.shares}` — delete: its target animation never existed (see CSS audit #2) | 🟢 | `PositionTable.tsx:34`, `PositionsTable.tsx:70` | ✅ done |
| 14 | Drop single-child fragments | 🟢 | `Stocks`, `Activity`, `Home` | todo |
| 15 | Redundant `<li>` onClick | 🟢 | `Searchbar.tsx:101` | todo |

**Suggested order:** the a11y cluster (#2–6) is one quick, unambiguous commit and the highest
signal for the interview gap. Then the two habits (#7–10) as their own commits. The rest is polish.
