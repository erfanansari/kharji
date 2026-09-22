# Privacy mode — design

**Date:** 2026-09-22
**Status:** Approved, ready for implementation planning

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

Live state lives in a small Zustand store (`src/stores/privacy.ts`) following the existing
`src/stores/currency.ts` shape, seeded from the server-supplied value by a hydrator
mounted in `Providers`, the way `CurrencyHydrator` already seeds the currency store.
Toggling updates the store and writes the cookie.

### Reach — what is masked

Masked:

- Everything rendered through `Money` and `AnimatedMoney` (15 consumer files): stat cards,
  table rows, the expense details drawer hero, account balance previews, debt amounts,
  asset values.
- Chart axis labels and tooltip values. The bars, lines and slices keep their shape — the
  page keeps its rhythm and the user keeps a sense of trend, while no number is readable.
- The net-worth debt footnote on the Overview card, which formats amounts inline.
- The `title` tooltip currently passed at 13 call sites (see below).

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
right-side flex container. `Eye` / `EyeOff` from `lucide-react`, `h-4 w-4`, the standard
borderless action-button treatment (`text-action-default`, `p-2`, `rounded-lg`, coloured
hover background). No label, no pill, no background, no toast on toggle, no banner.

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

| Unit                                                   | Responsibility                                                                                                                                                                                                    |
| ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/stores/privacy.ts`                                | The boolean. Vanilla Zustand store + selector hook, mirroring `stores/currency.ts`.                                                                                                                               |
| `src/hooks/use-privacy.ts`                             | Reads the store, exposes `{ hidden, toggle }`. Writes the cookie on toggle.                                                                                                                                       |
| `src/components/MaskedAmount`                          | Renders the dots + currency, owns the stagger animation, the reduced-motion fallback and the press-and-hold peek. Knows nothing about where the number came from.                                                 |
| `src/components/Money`, `src/components/AnimatedMoney` | Gate on `hidden`; render `MaskedAmount` instead of digits. Own the `title` attribute. Accept the exchange-rate opt-out prop.                                                                                      |
| `src/hooks/use-money-text.ts`                          | Privacy-aware wrapper over `useCurrency().display` / `.format` for the raw-string call sites (chart axes, tooltips, the debt footnote). Leaves `useCurrency` itself pure so exports and emails can't be affected. |
| Root layout                                            | Reads the cookie server-side and hands the value to `Providers` as the store's initial state.                                                                                                                     |
| `TopNav`                                               | Hosts the toggle button.                                                                                                                                                                                          |

`useCurrency()` stays untouched. Putting the mask inside it would have been fewer edits,
but it is also what exports and any future server-side formatting call — a single place
where a mistake silently corrupts a downloaded spreadsheet.

## Data flow

1. Request arrives. Root layout reads the privacy cookie and passes the value to
   `Providers`.
2. The hydrator seeds the store before first paint, so the server-rendered HTML already
   contains dots rather than digits.
3. `Money` / `AnimatedMoney` / `useMoneyText` subscribe; each renders dots or digits.
4. Toggle → store update → cookie write. Every subscriber re-renders in the same tick. No
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
- Cookie round-trip: the store seeds from the server-supplied value, and toggling writes
  the cookie.
- Peek reveals on pointer-down and re-masks on pointer-up and on `visibilitychange`.

## i18n

New keys in `messages/en.json` and `messages/fa.json`: the toggle's two `aria-label`
states and the masked figure's accessible name. Farsi copy follows the casual UI tone used
elsewhere, not the formal register reserved for legal pages.

## Out of scope

A Settings page section, database persistence and cross-device sync, flip-to-hide via
motion sensors, auto-hide after idle, masking the category or tag names, decoy/demo
numbers, and per-page or per-widget granularity.
