# Steak & Eggs — CSS Audit

The stylesheet companion to the JSX audit. Statuses in the checklist track what's been
applied (defects/dead-code batch landed 2026-08-13 in `6f531ed`, `d8f0c10`, `1527aab`).
Line numbers are as of **2026-08-13** and will drift — grep the quoted snippet if a number
looks off.

**Why this matters specifically:** the interview gap was "component reusability." CSS has the
same failure mode as JSX: repeating the *shape* instead of extracting it. The JSX refactor
extracted components; this audit checks whether the CSS kept up. (Spoiler: `PaginationControls`
the component got extracted — its styles didn't.)

Legend: 🔴 real defect · 🟡 repetition / smell · 🟢 minor / polish

---

## End goal: dark mode (decisions locked 2026-08-13)

The refactor's destination is light/dark theming. That upgrades the token item (#8) from a
dedup cleanup to the foundation, and it dictates the token *style*: **semantic roles**
(`--surface`, `--text`, `--border`), not named literals — dark mode is just the same roles
redefined under `[data-theme="dark"]`.

It also widens the scope beyond the audit's literal count: the theming blockers are the
colors nobody wrote down — **38 `white`s**, **5 `black`s**, **14 box-shadows** (shadows
become borders/lighter surfaces on dark), the body's default-black text, and color living in
JSX: the chart line `stroke="#8884d8"` (Recharts' example purple, never consciously chosen),
and inline SVG strokes in Searchbar/StatsPanel/Endpoint (fix: `currentColor`). The Logo
illustration keeps its fixed colors — it's artwork, not UI.

**Decisions:**
- **Theme control:** manual toggle (profile dropdown) persisted in localStorage, with the OS
  `prefers-color-scheme` as the first-visit default. `data-theme` attribute on `<html>`.
- **DataCat:** tokenized in the same pass, but dark values designed later — it stays light
  until its own phase (acceptable "flashlight effect" when entering it from dark mode).
- **Drift:** unify the near-duplicate values aggressively (differences ≤3/255 per channel) —
  every extra role must be designed twice once dark exists.

**Roadmap:** ① defects + dead code (#1–7) → ② pure-CSS dedup (#9) → ③ semantic token layer,
light values only, visual no-op (#8, now including whites/blacks/shadows/JSX colors) →
④ dark palette + toggle (#21–22).

**Gotchas parked for phase ④:** ticker logos with dark glyphs on dark cards (keep the logo
chip light in both themes); a dark counterpart for the `#AFD8DF` teal auth pages;
`color-scheme: light dark` so native inputs/scrollbars follow; set `data-theme` in a tiny
inline script in index.html so there's no wrong-theme flash before the bundle loads;
the shared `PaginationControls` consumes *themable* main tokens, so its instance inside
DataCat needs a pinning override (or DataCat's dark palette) before dark ships, else it
darkens inside a light page; one-off shadows (modal, dropdown, add/withdraw, overlay,
DataCat cards, sort insets) deliberately stayed literal in the token pass — dark mode
replaces the shadow strategy wholesale, so they get redesigned here, not renamed earlier.

---

## The structural fact everything else hangs off

**All 16 stylesheets share one global namespace.** Each component `import`s "its" CSS file,
which *looks* like scoping — but Vite bundles every imported stylesheet into the app globally.
`.shares-cell` in positionstable.css and `.shares-cell` in endpoint.css are the same class;
whichever rule the bundler emits last wins ties. Three real collisions below came from this.
**A fourth surfaced after dark mode shipped (found by Armaan in devtools, 2026-08-13):**
PositionsTable's empty/error rows borrowed DataCat's `.portfolio-row`, and both files defined
`.portfolio-row:hover` — identical while both said `#F5F5F5`, divergent once tokens split them
into themable `--hover` vs pinned `--dc-hover`. DataCat's pinned-light hover won by bundle
order, so those rows hovered *white inside dark mode*. Fixed by giving the main app its own
`.positions-state-row`; bare `portfolio-row` now exists only in DataCat (the fact that
DataCat's row classes are still *named* "portfolio" is #12's rename territory).

The systemic fix is **CSS Modules** (rename to `*.module.css`, Vite supports it out of the box
— class names get hashed per-file, collisions become impossible). Probably not worth adopting
now: the diff touches every component for zero user-visible gain, and the app has ~16 files,
not 160. Interview answer: "My CSS is global with per-page files, which caused real cross-page
collisions — I fixed the collisions and would reach for CSS Modules the moment the app or the
team grew, because convention stops scaling before tooling does."

---

## Patterns worth copying (the good)

These are the bar. When something below feels wrong, it's because it *doesn't* look like these.

- **`.ticker-logo` in application.css** — one shared, commented rule for a shared component,
  living in the app-level sheet. This is the model the pagination fix below should follow.
- **Focus ring moved to the wrapper** — `.search-input { outline:none }` looks like an a11y
  crime until you see `.nav-search-div:focus-within { outline:1px solid }` (searchbar.css:14).
  Same trick on `.status-div:focus-within` (endpoint.css:223). Removing an outline is fine
  *because* it was relocated, not deleted. Keyboard users still get a ring.
- **The floating-label mechanic** (`.ls-input:not(:placeholder-shown) + label`,
  loginsignup.css:160) — CSS-only, consistent between login form and searchbar.
- **State-aware cursor** — `.stats-container:not(.loaded) .p50 { cursor:default }`
  (endpoint.css:277): don't advertise a click that isn't wired up yet.

---

## Real defects (highest value)

- 🔴 **`.pagination-container` is defined twice with conflicting rules.** activity.css:44 says
  `justify-content:center` + Avenir + `column-gap:1rem`; endpoint.css:9 says
  `justify-content:space-evenly` + system font, no gap. Both are global, equal specificity —
  bundle order decides. **Confirmed in the built bundle (2026-08-13):** App.tsx imports
  `Activity` before `DCList`, so endpoint.css is emitted later and wins the contested
  properties. Activity renders `space-evenly` + system font, with activity.css's uncontested
  `column-gap:1rem` layered on (the cascade resolves per *property*, so what renders is a
  merge of both blocks). **Armaan confirmed the winner is the wanted look** — meaning
  activity.css's centered/Avenir block is dead intent (written, never rendered, not missed),
  and the look Activity *should* keep is currently sustained by a leftover rule in another
  section's file, one import-reorder away from vanishing.
  **Proposed fix (visual no-op):** let the component own its styles — a new `pagination.css`
  imported by `PaginationControls.tsx` (same convention as BuySell → buysell.css), holding
  `.pagination-container` frozen at today's computed result (space-evenly, system font,
  `rgb(64,68,82)`, `column-gap:1rem`), plus `.page-button`/`.page-span` (byte-identical in
  both files today). Delete both old blocks. Bonus tightening: `.dc-pagination-container`
  differs from this base only by `padding-bottom:1rem` (it was cloned from endpoint's rule) —
  make `PaginationControls` always apply its base class and treat the `className` prop as an
  extension (`` `pagination-container ${className}` ``), shrinking `.dc-pagination-container`
  to the one line it actually means.
- 🔴 **`animation: fadeIn` references keyframes that don't exist.** `.stock-shares`
  (positionstable.css:83) animates `fadeIn`, but there is no `@keyframes fadeIn` in any file —
  the animation has silently never run. This is the missing half of the JSX audit's item #13:
  the `key={position.shares}` remount trick exists *to re-trigger this animation* on share
  changes, and the animation was never defined. **Decision (Armaan, 2026-08-13): delete, don't
  define.** Today's behavior is the spec — defining the keyframes would *add* a flash the app
  has never shown, which doesn't belong in a cleanup commit. Delete the `animation` line, and
  with it the now-pointless `key={position.shares}` remount props (PositionTable.tsx:34,
  PositionsTable.tsx:70) — resolving JSX audit #13 in the same sweep. If the share-change
  flash is ever wanted, it returns as its own deliberate feature commit.
- 🔴 **Transposed-digit color typo.** `border: 1px solid rgb(50, 47, 48)`
  (addwithdraw.css:54) — every other ink in the app is `rgb(50, 48, 47)`. Invisible to the
  eye, which is exactly why literals scattered across 16 files are a liability (see Habit #2).
- 🟡 **`.cache-container` declares `border` twice** (endpoint.css:51,56) — `1px solid gray`
  overridden four lines later by `1px solid #ECEDEE`. The first is dead; delete it.
- 🟡 **`.shares-cell` is defined in two files** — positionstable.css:24 (`border-radius:0px`)
  and endpoint.css:135 (`padding:0.25rem 0`), with three consumers (PositionTable,
  PositionsTable, DataCat's TraceTable) all receiving the *merged* result. The
  `border-radius:0px` half is a no-op (nothing ever sets a radius). **Proposed fix:** one
  definition, one owner, with a comment naming all three consumers.
- 🟡 **Media queries live in the wrong files.** `.nav-auth`'s mobile rules are in **home.css**
  (home.css:78) — so they'd stop applying to Activity/Stocks if home.css ever stopped being
  bundled. Worse, the *public* nav's mobile rules (`.logo-desktop`, `.nav`, `.nav-right`,
  `.login-link`, `.welcome-start-desktop`) are in **authenticated.css** (:247–275). It works
  only because everything is global *and* those files happen to sort after their base rules in
  the bundle — a same-specificity override, so source order is load-bearing and cross-file.
  **Proposed fix:** move each media override into the file that owns its base rule; same file
  + later position makes the override structural instead of luck.

## Dead code

- 🟡 **howitworks.css is a ghost.** The HowItWorks page no longer exists; the file survives
  only to serve the 404 pages (`.howto-parent.four`, `.howto-header.four`, `.four-main`).
  `.howto-main`, `.howto-body`, `.howto-create` have no consumers — delete *only those three*
  here; the live classes are item #14's rename. Agreed naming for #14 (2026-08-13):
  `howitworks.css` → `notfound.css`; `.four-main` → `.not-found-main`, `.howto-parent` →
  `.not-found-parent`, `.howto-header` → `.not-found-header`, with the `.four` modifier
  values merged into the bases (only the `four` variants ever render — the base
  `margin-top:65px` / `row-gap:32.5px` are dead values) and the `four` token dropped from
  JSX. The stray `.logo-desktop.four` (public.css, the 320px 404 logo) → `.logo-desktop.large`
  — from Logo's perspective it's a size, not a page. Run #14 as its own commit *after* the
  deletes so git's rename detection survives (delete + mass class-rename in one commit can
  push the file past the similarity threshold).
- 🟡 **`.login-link.signup.howto`** (public.css:81) and its mobile override
  (authenticated.css:272) — the `howto` modifier appears in no component. Delete both.
- 🟡 **`.login-left` / `.signup-left`** mobile rules (loginsignup.css:171–179) — these classes
  were renamed `.ls-left` long ago. Delete.
- **Not dead, just looks it:** `.recharts-default-tooltip` (home.css:63) and `.chart svg`
  (home.css:68) style *third-party* Recharts internals — worth a comment so nobody "cleans"
  them later.

---

## Habit #1 — same intent, new literal every time (no design tokens)

The CSS equivalent of the JSX audit's "auth fetch duplicated 15 times":

- **The same font stack is spelled out 75 times.** Avenir stack ×34, system stack ×34
  (in two slightly different variants — privacy.css drops "Helvetica Neue"), Futura ×7.
  Three fonts, seventy-five declarations.
- **~120 color literals for ~20 actual colors**, with drift you can't see but grep can:
  - `#32302f` (public.css `.nav-text`) is literally `rgb(50, 48, 47)` in hex — the file
    didn't know it was the same color.
  - Button hover is `#535050` twice (public, addwithdraw) and `#535250` once (buysell).
  - Muted text is `rgb(97, 94, 92)` ×8, `rgb(104, 102, 100)` once (endpoint
    `.status-label`), and `#6B6961` in privacy.
  - Light borders are `rgb(233,236,239)` ×8 *and* `#ECEDEE` ×4 — three RGB points apart.
  - Row hover is `#F5F5F5` ×5 in tables, `#F2F2F2` ×4 on controls.
  - Plus the `rgb(50, 47, 48)` typo above — the kind of bug tokens make impossible.

**Proposed fix (per the dark-mode decisions above):** `:root` custom properties in
application.css — `--font-display` (Futura), `--font-body` (Avenir), `--font-ui` (system),
plus a **semantic role palette**: `--text`, `--text-muted`, `--text-cool` (the table/DataCat
ink), `--surface` (today's 38 `white`s), `--page-bg`, `--paper`, `--border`, `--border-cool`,
`--hover`, `--positive`, `--negative`, `--brand`, the `--danger` family, `--btn-bg` /
`--btn-hover`, `--shadow`, and `--dc-*` roles for DataCat — then swap every literal (and
every `white`/`black`) for its var. Drifted near-duplicates get unified into one role
(`#535250`→`#535050`, `rgb(104,102,100)`→`--text-muted`, `#ECEDEE`→`--border-cool`,
`#F5F5F5`/`#F2F2F2`→ one `--hover`). Privacy.css's one-page palette (`#6B6961`, `#1A1915`,
`#C15F3C`, `#E5E3DB`) stays literal for now — tokenizing a single-consumer palette is bloat —
which also means the privacy page sits out of dark mode until someone cares.

**Applied 2026-08-13 (`025673c`).** 41 tokens in application.css (3 fonts, 23 themable main
roles, 8 pinned `--dc-*` roles, `--chart-line`, `--shadow-card`); 237 `var()` references in
the built bundle; zero font stacks or palette literals left outside `:root`/privacy. Notes:
the chart line needed no JSX change (a `.chart .recharts-line-curve { stroke: var(--chart-line) }`
rule beats the SVG attribute); the three inline-SVG chevrons/magnifier are `currentColor`
with the color pinned on their wrapper rules; the two "blank the button while submitting"
tricks now self-maintain in any theme (`--btn-bg`-on-`--btn-bg`, `--surface`-on-`--surface`)
and carry comments (#17); one-off shadows stayed literal for phase ④ (see gotchas above).

A safe second phase after tokens: set `body { font-family: var(--font-ui) }` and *delete* the
now-redundant per-rule declarations — but each deletion needs an inheritance check (what's the
nearest ancestor that sets a font?), so it's a per-rule judgment, not a sed.

## Habit #2 — duplicating a whole rule block to change one property

The CSS twin of JSX habit #1 ("duplicating an element to swap one word"). Worst offenders are
the sortable column headers:

```css
/* datacat.css:124–157 — three copies of the same six-line block */
.dc-row-heading      { …6 lines… }
.dc-row-heading-asc  { …same 6 lines… + box-shadow inset bottom }
.dc-row-heading-desc { …same 6 lines… + box-shadow inset top }
```

Same trio again as `.portfolio-row-heading*` (endpoint.css:118–169, including three hover
rules that are all `background-color:#EAECEF`). Same pattern in miniature:

- 🟡 `.side-button` / `.side-button-active` (datacat.css:38–54) and `.nav-button` /
  `.nav-button-active` (endpoint.css:239–255) — full copies differing only in `color`.
- 🟡 `.activity-row` vs `.activity-header-row` (activity.css:52–64) — byte-identical.
- 🟡 `.position` vs `.position-two` (stocks.css:60–70) — byte-identical.
- 🟡 `.portfolio-row` vs `.portfolio-row-selected` (endpoint.css:103–116) — differ only in
  `background-color`.
- 🟡 `.market-data-container` / `.company-data-container` and their `> div` rules
  (stocks.css:78–90, 108–114) — identical pairs.
- 🟡 Five `.activity-row-heading:nth-child(n)` rules all saying `width:14%`
  (activity.css:74–78) — collapses to `:nth-child(-n+5)`.

**Two fix levels:** the pure-CSS version comma-joins shared declarations into one block and
leaves variant classes holding only what differs (no JSX touched, zero risk). The full version
renames `-active`/`-asc`/`-desc`/`-selected` to real modifiers (`.side-button.active`) — that
also simplifies the JSX (`className={active ? 'nav-button-active' : 'nav-button'}` becomes
`` `nav-button ${active ? 'active' : ''}` ``, matching the app's `.loaded` convention), but it
edits components, so it's a separate pass.

## Habit #3 — buttons are borrowed, not designed

The app has four parallel implementations of the same dark primary button: `.next`
(buysell.css:101), `.aw-submit` (addwithdraw.css:79), `.login-link.signup` (public.css:45),
`.page-button` (activity/endpoint). Same pill shape, same hover idea — this is where the
`#535050`/`#535250` drift came from. Worse, the *modals* build buttons by stacking public
marketing-page classes into four-class chains:

```css
/* authenticated.css:234 — a delete-account button named "login link" */
.login-link.signup.modal-delete-btn.submitting:disabled { … }
```

**Proposed fix:** a real `.btn` / `.btn-primary` / `.btn-danger` set. This is the single best
"component reusability" story remaining in the CSS, and it dissolves several smells at once:
the specificity chains, the drifted hover colors, and the cross-file order dependency where
`.login-link.signup.login`'s base lives in public.css but its mobile override lives in
loginsignup.css.

## Habit #4 — variant classes named by counter, not meaning

`.home.two`, `.position-two`, `.stock-name-two`, `.portfolio-row-two`, `.nav-search-div-two`,
`.home-left-two`, `.trace-details.two`, `.sidebar-button-container.two`,
`.bs-parent-container.two` — and the `.four` family (`.four-main`, `.logo-desktop.four`,
`.howto-header.four`, `.howto-parent.four`).

`.four` at least *means* something (the 404 page — rename to `.not-found` and it documents
itself). `.two` means "the second one I wrote." Each is either identical to its base
(`.position-two` — delete it) or a real variant (name what differs). Needs JSX edits; best
done file-by-file. Related: `.trace-details.two` lives in endpoint.css while its base lives in
datacat.css, and positionstable.css has a `.portfolio-row:hover` duplicating endpoint's —
modifiers straying from their base file.

---

## Smaller stuff

- 🟢 **`#status-select`** (endpoint.css:190) — the only ID selector in the codebase. Keep the
  `id` for the label association, add a class for styling.
- 🟢 **Bare `transition: 0.4s` / `0.2s` / `all`** (public.css:40 `.login-link`,
  authenticated.css:55 `.profile-trigger`, addwithdraw.css:24, …) — transitions *every*
  animatable property. Name the properties each hover actually changes.
- 🟢 **`.submitting` states that hide text by matching colors** — `.next.submitting:disabled`
  sets `color` equal to `background` (buysell.css:120); the modal delete button goes entirely
  white while submitting (authenticated.css:234). If "blank out while the request is in
  flight" is the intended look, it deserves a comment; if a spinner was supposed to sit there,
  it's a bug. Worth deciding which.
- 🟢 **Redundant dual state classes** — `.ls-error-container` carries both `.hidden` and
  `.visible` modifiers for one boolean (loginsignup.css:16–22); `.welcome-error.visible {
  opacity:1 }` restates the base value (welcome.css:38). One modifier per boolean.
  **On hold (2026-08-13):** a single-`.visible` version was implemented and reverted at
  Armaan's request — he suspects the dual classes were deliberate. Archaeology: the pair
  comes from `13dc902` ("test login error handling", Feb 15), which kept the error *mounted*
  and class-toggled so dismissing it on typing would animate instead of snapping (previously
  `setError(null)` unmounted it mid-frame). The base rules (`opacity:1`, the transition)
  predate that commit, so the properties ended up split across base/`.hidden`/`.visible` by
  evolution. In today's always-mounted JSX the two forms compute identically — but it stays
  as-is unless Armaan decides otherwise.
- 🟢 **`.modal .ls-label`** (authenticated.css:190) — the modal reaches into loginsignup.css's
  floating-label class. Works, but couples the modals to the auth page's stylesheet.
- 🟢 **Formatting** — mixed tabs/spaces inside single blocks (positionstable.css:1–8,
  `.symbol-name`), zero-indent declarations (stocks.css:43–46, positionstable.css:67–70),
  missing space in `rgba(0,0,0,0.06)0px` (searchbar.css:39, endpoint.css:55,75 — parses,
  barely). One `prettier --write "src/stylesheets/*.css"` — as its own commit so it doesn't
  pollute a real diff.

## Leave alone (so you don't over-refactor)

- **The per-component `opacity:0` → `.loaded` fade rules.** That's the app's signature
  transition convention, already blessed on the JSX side. A shared `.fade-in` utility would be
  a rename-with-indirection. (Durations drift 50–150ms; standardizing on one `--fade-ms` token
  is optional polish, not a defect.)
- **The five collapsible-error implementations** (`.bs-error-container`,
  `.af-error-container`, `.ls-error-container`, `.welcome-error`, `.cache-hidden`) — same
  *idea*, but genuinely different geometry and triggers. A shared utility would need modifier
  soup to cover them; not worth it at this size.
- **The same 768px breakpoint repeated per file** — fine, *once* each override lives beside
  its base rule (defect #6 above).
- **Further stylesheet folders beyond `datacat/`** (a `pages/`/`components/` split) —
  considered and rejected 2026-08-13. `datacat/` marks a product boundary (own palette, own
  dark-mode phase); pages-vs-components is just taxonomy, and the files resist it
  (authenticated.css spans Navbar + modals + pages; howitworks.css serves a page and a
  component). ~13 flat files is scannable. If the app outgrows that, the next rung is
  co-locating CSS beside its component (with Modules), not a deeper parallel tree.

---

## Checklist

| # | Item | Type | File | Status |
|---|------|------|------|--------|
| 1 | `.pagination-container` conflict → component owns a pagination.css | 🔴 collision | `activity.css:44` / `endpoint.css:9` | ✅ done |
| 2 | Delete dead `animation: fadeIn` + the `key={shares}` remount props it justified | 🔴 defect | `positionstable.css:83` + 2 tsx | ✅ done |
| 3 | `rgb(50, 47, 48)` typo | 🔴 defect | `addwithdraw.css:54` | ✅ done |
| 4 | `.cache-container` double `border` | 🟡 dead decl | `endpoint.css:51` | ✅ done |
| 5 | Dead rules (howto-*, login-left, signup-left, `.howto` btn) | 🟡 dead | `howitworks/public/authenticated/loginsignup` | ✅ done |
| 6 | Move media rules to their owning files | 🟡 org | `home/authenticated/public/welcome` | ✅ done |
| 7 | `.shares-cell` split across two files → one owner | 🟡 collision | `positionstable.css:24` / `endpoint.css:135` | ✅ done |
| 8 | Fonts + all colors (incl. `white`/`black`/shadows/JSX SVGs) → semantic `:root` roles | 🟡 dup ×~200 | all files + `Chart/Searchbar/StatsPanel/Endpoint` | ✅ done |
| 9 | Rule-copies differing by one property → comma-join (pure CSS) | 🟡 dup | `datacat/endpoint/activity/stocks` | ✅ done |
| 10 | `*-active`/`*-asc` → real modifiers (`.active`) | 🟡 naming | CSS + JSX | ✅ done |
| 11 | Button consolidation (`.btn` set; un-borrow `.login-link` from modals) | 🟡 reuse | `public/buysell/addwithdraw/authenticated` + JSX | ✅ done |
| 12 | Counter naming (`.two`/`.four`) → semantic names | 🟡 naming | CSS + JSX | todo |
| 13 | `body` default font + prune redundant `font-family` decls | 🟡 dup | all files | todo |
| 14 | howitworks.css → notfound.css, collapse `.four`-only variants | 🟢 | `howitworks.css` + JSX | ✅ done |
| 15 | `#status-select` → class | 🟢 | `endpoint.css:190` + JSX | todo |
| 16 | Bare `transition: all` → named properties | 🟢 | `public/authenticated/addwithdraw` | todo |
| 17 | `.submitting` invisible-text states: comment or fix | 🟢 | `buysell.css:120` / `authenticated.css:234` | ✅ done |
| 18 | Redundant dual state classes (`.hidden`+`.visible`) | 🟢 | `loginsignup/welcome` + JSX | on hold (Armaan) |
| 19 | Comment third-party overrides (recharts) | 🟢 | `home.css:63` | ✅ done |
| 20 | Prettier formatting pass | 🟢 | all files | todo |
| 21 | Dark palette (main app) + `[data-theme="dark"]` values | 🌓 feature | `application.css` | ✅ done |
| 22 | Theme toggle: profile dropdown UI, localStorage, system default, no-flash init | 🌓 feature | `Navbar` + `index.html` | ✅ done |
| 23 | DataCat dark palette (later phase) | 🌓 feature | `datacat/endpoint.css` | todo |
| 24 | Move DataCat styles into `stylesheets/datacat/` (mirrors the JSX layout; give TraceTable its own cell class so #7 doesn't cross the boundary) | 🟡 org | `datacat.css` / `endpoint.css` + 2 imports | ✅ done |
| 25 | Move `authenticated.css` import from Home.tsx to ProtectedRoute.tsx (it styles the layout's Navbar/modals, not Home; mirrors Public.tsx) | 🟡 org | `Home.tsx:2` → `ProtectedRoute.tsx` | ✅ done |

**Suggested order (= dark-mode roadmap):** ① #1–7 as one "defects and dead code" commit —
small, safe, each line has a story, and it shrinks everything after. ② #9, pure-CSS dedup —
fewer places to tokenize. ③ #8, the semantic token layer as a visual no-op commit. ④ #21–22,
the actual dark mode. #10–12 (JSX renames), #23, and the 🟢 tail can slot in anywhere after
③, with #20 (formatting) kept separate so it doesn't bury a real diff.
