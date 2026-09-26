# Privacy mode — design

**Date:** 2026-09-22
**Status:** Shipped in v1.8.0 (mask rendering fixed in v1.8.1). Updated 2026-09-26 to match
what was actually built — the sections marked _"changed during implementation"_ record where
the design moved and why.

## Problem

Opening Kharji in public — a café, a queue, the office — puts net worth, income, every
expense amount and every account balance on screen at a glance. Adding one expense
shouldn't require broadcasting the rest. The app needs a fast way to blank the numbers
without blanking the app.

## What it is

A single per-device boolean. When on, every figure that reveals the user's financial
position renders as dots instead of digits. The app stays fully usable: navigation,
categories, dates, descriptions, chart shapes and the expense form all behave normally.

Scope is deliberately one toggle. No settings section, no cross-device sync, no
flip-to-hide gesture, no auto-hide-on-idle.

## Prior art that shaped the decisions

- **Trading 212** hides anything revealing the user's position and keeps what is true for
  everyone — market prices, FX rates, percentages. That line is adopted here.
- **Tangem** hides balances behind a physical gesture (flip the phone). The gesture is out
  of scope, but the underlying idea — reveal briefly without changing the mode — becomes
  press-and-hold-to-peek.
- **Monarch Money's Demo Mode** substitutes plausible fake numbers so screenshots look
  normal. Rejected: a user who misreads decoy data as real has been actively harmed, which
  is worse than the problem being solved.

## Decisions

### Mask style — dots, currency retained

`••••• IRT`, `$ ••••`. A fixed five dots (four for the secondary line) regardless of the
real magnitude, with the currency symbol or code kept in its original position per
`getCurrency(...).symbolPosition`.

Blur was the aesthetic favourite and was rejected on a concrete leak: a blurred figure
keeps its width, so an onlooker can still distinguish a four-digit number from an
eight-digit one — which is most of what the feature is meant to conceal. A fixed dot count
is width-stable by construction. Shimmer and skeleton bars were rejected for colliding
with the meaning of the existing loading state.

The dots animate in staggered 35ms apart on the transition; under
`prefers-reduced-motion` this degrades to a plain crossfade.

### Two RTL traps the dots walk into

_Added during implementation._ Neither was foreseen, both shipped broken once, and both are
invisible to any check that reads `textContent` — the string is correct in both cases and
only the rendering is wrong. Anything touching this code needs verifying by rendered
geometry or a screenshot, in Farsi.

**A prefix symbol flips.** `$` sits left of `$۰٫۴۳` inside an RTL line because the digits
are numeric and anchor the run. Bullets are _neutral_, so `$•••••` has nothing to anchor
against, inherits the paragraph's RTL, and renders `•••••$`. `maskMoney` therefore wraps a
prefix currency in a bidi isolate (`U+2066`/`U+2069`) — doing explicitly what the digits
did implicitly. It lives in the **string**, not in a wrapper element, because chart
tooltips, select subtitles and interpolated sentences only ever receive text. A suffix
currency needs none of it: the currency word is strongly RTL and anchors its own run.

**Persian stops joining if you split it.** Animating the dots means giving each one its own
span. Splitting _every_ character to do that also splits `تومان` into five text nodes, and
Persian letters only join within a single node — the word visibly falls apart while
`textContent` still reads perfectly. Only the run of dots is split; the text either side
stays whole.

### The real value leaves the DOM

Masking is not `visibility: hidden` over live text. When privacy mode is on the digits are
not rendered at all. This covers three leaks a purely visual mask would not:

1. Screen readers announcing the real amount from the accessible name.
2. `title` tooltips on hover (see below).
3. Select-and-copy, and anything reading the DOM.

### Persistence — cookie, not localStorage, not the database

Stored in a cookie, written client-side exactly the way `src/components/LocaleToggle`
writes `LOCALE_COOKIE` (`path=/`, `SameSite=Lax`, `Secure` off localhost, ~1 year), and
read on the server in the root layout, which passes it down as the store's initial value.

The server read is the point. With localStorage the server renders the real numbers, they
paint, and JS replaces them a frame later — a visible flash of exactly the data the
feature exists to hide. Seeding from the cookie means the server-rendered HTML is already
masked, so no digit ever reaches the screen, and server and client agree on the first
render with no hydration mismatch.

Not stored in the database. Privacy posture is a property of _where you are_, not of your
account: a phone carried into the office and a laptop at home want different answers.
Keeping it device-local also avoids a migration, an API route, a React Query hook and a
network round trip on toggle, which is the entire 5-layer preference stack the currency
and notification settings each carry.

Live state lives in a React context (`src/features/privacy/PrivacyProvider`), mounted in
`Providers` and given the cookie value as a prop by the root layout. Toggling updates the
context and writes the cookie.

_Changed during implementation._ The design said a Zustand store seeded by a hydrator, the
way `CurrencyHydrator` seeds the currency store. That pattern seeds inside a `useEffect`,
which runs **after** first paint — so the real figures would render for a frame and then be
replaced, which is precisely the leak the cookie exists to prevent. A context takes the
value as a prop, so server and client agree on render #1 and no digit is ever painted. It
also sidesteps a module-level store on the server being shared across requests.

### Reach — what is masked

Masked:

- Everything rendered through `Money` and `AnimatedMoney` (15 consumer files): stat cards,
  table rows, the expense details drawer hero, account balance previews, debt amounts,
  asset values.
- Chart tooltip values. The bars, lines and slices keep their shape — the page keeps its
  rhythm and the user keeps a sense of trend, while no number is readable.
- Chart axis labels, which are **blanked** rather than dotted. _Changed during
  implementation:_ five ticks of dots down the side of a chart reads as noise, and the
  axis line and gridlines already carry the shape.
- The net-worth debt footnote on the Overview card, which formats amounts inline.
- The `title` tooltip currently passed at 13 call sites (see below).
- _Added during implementation_, all found by auditing every page rather than reasoning
  from the component tree: the settle and unsettle debt modals (the amount is interpolated
  into a sentence), the asset revalue modal's old→new comparison, the account picker's
  balance subtitles, and the expense drawer's "paid from" line — that last one keeps the
  raw stored delta rather than re-converting, so the peek hands back that exact figure.

Not masked, deliberately:

- **Exports** (CSV/XLSX). `src/utils/export/index.ts` reads raw `e.amount` and never
  passes through the formatting layer, so this requires no work — but it must stay that
  way. An export exists to be opened elsewhere; dots in a spreadsheet are a bug.
- **Emails.** Server-rendered, arrive in a different context, and the cookie isn't
  meaningful there.
- **The expense/income/asset form fields while typing.** The user is entering the number
  and needs to see what they typed.
- **The USD/Toman exchange rate** on the Overview card. A published rate is identical for
  everyone and reveals nothing about the user — the Trading 212 line. `AnimatedMoney`
  takes an opt-out prop for this case.

### The `title` leak

Thirteen call sites across `OverviewStats`, `ExpenseStats`, `DebtsSummary`,
`IncomeSummary`, `AssetsSummary` and `AccountSelect` wrap the figure in
`<p title={formatFull(amount, currency)}>`, so the exact uncompacted amount appears on
hover. Masking the rendered digits while leaving that attribute in place would defeat the
feature for anyone with a mouse.

Rather than patch thirteen sites, `AnimatedMoney` absorbs the `title` itself — it already
receives `amount` and `currency` and already owns the compact-vs-full distinction that the
attribute exists to bridge. Call sites drop the prop. This removes the duplication and
leaves exactly one place where the tooltip can leak.

### The control

An icon-only button in `TopNav`, sibling to the avatar button inside the existing
right-side flex container. `Eye` / `EyeOff` from `lucide-react`, `h-4 w-4`. No label, no
toast on toggle, no banner.

_Changed during implementation._ It first shipped with the borderless action-button
treatment (`text-action-default`, `p-2`, coloured hover) and read as stuck on afterwards:
a 32px unbordered target beside a 46px bordered pill, sharing no edge and no height with
anything. It now copies the avatar button's border, radius and hover, with `p-3.5` around
the 16px icon landing on the same 46px box. Still icon-only and still one tap — it just
has something to line up against. A merged single-container cluster was considered and
rejected: it costs the avatar its own hover shape and boxes in any third control.

Icon convention follows the password field (`FormInput`), not `ThemeToggle`: the icon
shows the **current state** (`EyeOff` while hidden), because it is the only indication
that privacy mode is on. `aria-pressed` reflects the state; `aria-label` comes from the
same i18n shape as the existing `showPassword` / `hidePassword` keys.

### Peek

Press and hold any masked figure and that one figure alone reveals; release re-masks.
350ms long-press on touch so it doesn't fight scrolling, immediate on mouse down. Also
re-masks on `visibilitychange` and window blur, so tabbing away never leaves a figure
exposed.

Pointer-only. Keyboard users toggle the whole mode instead — hold-to-reveal has no
reasonable keyboard equivalent, and peek is a convenience rather than the only path to the
data.

## Components

| Unit                                                   | Responsibility                                                                                                                                                                                           |
| ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/core/privacy/cookie.ts`                           | The cookie name, the read (`isPrivacyHidden`) and the client-side write. Shared by the server layout and the toggle.                                                                                     |
| `src/features/privacy/PrivacyProvider`                 | Holds the boolean. Takes the cookie value as `initialHidden`; `usePrivacy()` exposes `{ hidden, toggle }`, and toggling writes the cookie.                                                               |
| `src/features/privacy/PrivacyToggle`                   | The `TopNav` button. Bordered to match the avatar beside it — see "The control".                                                                                                                         |
| `src/components/MaskedAmount`                          | Renders `maskMoney`'s string, splitting only the dot run into animated spans. Owns the stagger, the reduced-motion fallback and the press-and-hold peek. Knows nothing about where the number came from. |
| `src/features/ExchangeRate/utils/currency.ts`          | `maskMoney` — the masked string itself, including symbol placement and the bidi isolate. Shares `placeSymbol` with `formatMoney` so a mask lands exactly where the real figure did.                      |
| `src/components/Money`, `src/components/AnimatedMoney` | Gate on `hidden`; render `MaskedAmount` instead of digits. Own the `title` attribute. Accept the `sensitive={false}` exchange-rate opt-out.                                                              |
| `src/hooks/use-money-text.ts`                          | Privacy-aware wrapper over `useCurrency().format` / `.formatFull` / `.display` / `.sumDisplay` for the raw-string call sites. Leaves `useCurrency` itself pure so exports and emails can't be affected.  |
| Root layout                                            | Reads the cookie server-side and hands the value to `Providers`.                                                                                                                                         |

`useCurrency()` stays untouched. Putting the mask inside it would have been fewer edits,
but it is also what exports and any future server-side formatting call — a single place
where a mistake silently corrupts a downloaded spreadsheet.

## Data flow

1. Request arrives. Root layout reads the privacy cookie and passes the value to
   `Providers`.
2. `PrivacyProvider` holds that value from its first render, so the server-rendered HTML
   already contains dots rather than digits.
3. `Money` / `AnimatedMoney` / `useMoneyText` read the context; each renders dots or digits.
4. Toggle → context update → cookie write. Every consumer re-renders in the same tick. No
   network, no await.

## Error handling

There is no failure path worth defending. A missing or malformed cookie means "not
hidden", which is the current behaviour. A blocked cookie write degrades to
session-only — the toggle still works, it just won't survive a reload; not worth a
warning. There is no server call to fail.

## Testing

Jest, matching the existing suite.

- Mask formatting keeps the currency in the correct position for prefix (`$`) and suffix
  (`IRT`) currencies, in both `en` and `fa` locales.
- Masked output is width-stable: a four-digit and a nine-digit amount produce identical
  dot counts.
- `AnimatedMoney` renders no digits **and no `title` attribute** when hidden, and both when
  visible. This is the regression test for the tooltip leak.
- The exchange-rate opt-out stays visible while privacy mode is on — the one deliberate
  exception, so it needs a test that fails if someone "fixes" it later.
- Cookie round-trip: `isPrivacyHidden` treats anything unrecognised as visible, and
  toggling writes the cookie.
- Peek reveals on pointer-down and re-masks on pointer-up and on `visibilitychange`. The
  pointer-up listener is on the **window**, so a release that lands anywhere else still
  re-masks — there is a test for exactly that, because listening on the element left the
  figure stranded on screen.
- The bidi isolate wraps a prefix currency and not a suffix one, and survives the
  per-character split in `MaskedAmount`.
- The currency word stays in **one text node** — the regression test for Persian letters
  coming apart.

Two caveats on what the suite can prove. jsdom does no layout, so none of these assert
visual order; they pin the mechanism, and the rendering itself needs a browser. And
`@number-flow/react` ships ESM this Jest transform chain won't compile, so
`__mocks__/@number-flow/react.tsx` stands in for it with the same rendered text.

## i18n

New keys in `messages/en.json` and `messages/fa.json`: the toggle's two `aria-label`
states and the masked figure's accessible name. Farsi copy follows the casual UI tone used
elsewhere, not the formal register reserved for legal pages.

## Out of scope

A Settings page section, database persistence and cross-device sync, flip-to-hide via
motion sensors, auto-hide after idle, masking the category or tag names, decoy/demo
numbers, and per-page or per-widget granularity.
