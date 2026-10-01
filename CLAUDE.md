# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a personal finance tracker application built with Next.js 16, using the App Router architecture. The stack includes:

- **Framework**: Next.js 16.0.10 (React 19.2.3)
- **Language**: TypeScript with strict mode enabled
- **Database**: Turso (libSQL) via `@libsql/client`
- **Styling**: Tailwind CSS v4 (using new PostCSS plugin architecture)
- **Package Manager**: pnpm 10.24.0
- **Fonts**: Geist Sans and Geist Mono (via next/font)
- **Charts**: Recharts for data visualization

## Development Commands

```bash
# Install dependencies
pnpm install

# Run development server (http://localhost:3000)
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start

# Lint code
pnpm lint

# Database management
pnpm migrate       # Run database migration
pnpm db:test       # Test database connection and verify tables
```

## Application Features

### Core Features

- **Expenses**: Track daily expenses with categories, descriptions, and dual currency (USD/Toman)
- **Income**: Track monthly income by type (salary, freelance, investment, gift, other)
- **Assets**: Track wealth portfolio across 7 categories (cash, crypto, commodity, vehicle, property, bank, investment)
- **Dashboard**: Overview with financial summaries, income vs expenses charts, asset distribution
- **Reports**: Spending analysis with charts and heatmaps
- **Exchange Rate**: Live USD/Toman exchange rate integration
- **Transaction Details Modal**: Click any transaction row to view full details in a modal popup
- **Tag Management**: Hybrid tag system with inline quick actions and centralized Settings management
- **Repeating Expenses**: an expense can repeat on a schedule, on either calendar

### Repeating Expenses

**Repetition is a property of the expense's date — not a separate thing the user manages.** This
follows Todoist's model, and the UI is deliberately just one dropdown (`RepeatField`) sitting under
the date in the expense form: _doesn't repeat / every day / week / month / year / custom…_. Custom
reveals interval, calendar and end date.

There is **no** rules list, no Recurring tab, no upcoming strip and no pause. All of those were
built and then removed: they spent page chrome on a two-way switch and split one mental model — "my
expenses" — across two modes. Stopping a repeat means opening the expense and choosing "doesn't
repeat". Don't reintroduce a separate management surface without a deliberate decision.

Underneath, a `recurringExpenses` row still exists — the user just never sees it. It's created,
updated and deleted purely as a side-effect of saving the expense that owns it
(`syncExpenseRepeat`), and the owning expense's `date` is the rule's `anchorDate`.

**Scheduling model — anchor + index, never a rolling pointer.** A rule stores `anchorDate` and
`postedCount`; every due date is recomputed as `occurrenceAt(anchor, postedCount)`. Stepping
forward from the previous occurrence instead would make the month-end clamp lossy — Jan 31 → Feb 28
→ Mar 28, drifting off the 31st permanently. Recomputing gives Jan 31 → Feb 28 → **Mar 31**.
`nextDueDate` is a denormalized copy of that computation, kept only so "is anything due?" is one
indexed query. **Never increment it in place.**

**Per-repeat calendar.** `calendar` is `gregorian` or `jalali` and is meaningful only for
monthly/yearly — a week is seven days in both systems, so the control is hidden for daily/weekly.
Rent on 1 Farvardin genuinely recurs on Jalali months; a USD subscription recurs on Gregorian.
Defaults to the user's resolved calendar.

**Where the code lives:**

- `src/core/recurring/schedule.ts` — pure occurrence math, no clock or I/O, so the server
  materializer and the form's live preview can't drift apart. Well covered by tests; extend them
  when touching it.
- `src/core/recurring/materialize.ts` — turns due rules into expense rows.
- `src/core/database/expense-repeat.ts` — creates/updates/deletes the rule behind an expense.
- `src/features/expenses/components/RepeatField/` — the entire UI.

**Materialization** runs from two places: the daily cron (`/api/cron/reports`, all users) and
lazily on the read path (`GET /api/expenses`, current user only) so someone opening the app before
the cron fires still sees today's rent. They can race safely — the partial unique index
`idxExpenseRecurringOnce` makes a duplicate insert a no-op.

**Rules that must hold:**

- "Today" comes from `todayInTimeZone()` (Asia/Tehran), never UTC. Expense dates carry no timezone
  and the cron runs at 09:00 UTC, so a UTC "today" posts 1st-of-month rules on the wrong local day.
- Catch-up occurrences snapshot the rate that was current **on their own due date**
  (`getEntryRateOn`), not today's — a three-month catch-up must stay historically honest.
- A missing rate breaks the loop **without** advancing `postedCount`, so the occurrence is retried
  rather than silently skipped.
- Removing a repeat keeps the expenses it already posted (`expenses.recurringId` is
  `ON DELETE SET NULL`) — that's money actually spent.
- A new rule starts at `postedCount = 1`, because the expense being saved **is** occurrence #0.
  Regressing this to 0 would post a duplicate on the same date; there's a test guarding it.
- Editing amount/description/category/tags/currency updates what future occurrences say but leaves
  the schedule alone; editing frequency/interval/calendar/date re-baselines `postedCount` via
  `countOccurrencesBefore` so rescheduling never retro-posts history.

### Tag Management System

Hybrid approach with two interfaces:

**1. Inline (TagInput):** Create/rename on-the-fly, unselect tags (X button), auto-complete, keyboard shortcuts

**2. Settings Page:** View usage stats, search/filter, create/rename/delete with warnings

**Database:** `tags` and `expense_tags` junction table with CASCADE DELETE. Unique per user `(user_id, name)`, case-insensitive duplicates blocked.

**UX:** X on pills = unselect (not delete). Global delete only in Settings with usage count warning.

### Asset Categories

Assets are organized into 7 simple categories. Users provide custom names for their assets:

- `cash` - Cash holdings
- `crypto` - Cryptocurrency (BTC, ETH, etc.)
- `commodity` - Gold, silver, etc.
- `vehicle` - Cars, motorcycles, etc.
- `property` - Real estate
- `bank` - Bank accounts
- `investment` - Stocks, bonds, etc.

### Income Types

- `salary` - Regular employment income
- `freelance` - Contract/freelance work
- `investment` - Investment returns
- `gift` - Gifts received
- `other` - Other income sources

## Project Structure

```
kharji/
├── src/
│   ├── @types/              # TypeScript type definitions
│   │   ├── asset.ts         # Asset, AssetCategory types
│   │   ├── income.ts        # Income, IncomeType types
│   │   └── index.ts         # Shared types
│   ├── app/
│   │   ├── (auth)/          # Auth route group
│   │   │   ├── login/       # Login page
│   │   │   ├── signup/      # Signup page
│   │   │   ├── forgot-password/  # Forgot password page
│   │   │   └── layout.tsx   # Shared auth layout
│   │   ├── (dashboard)/     # Dashboard route group
│   │   │   ├── income/      # Income tracking page
│   │   │   └── overview/    # Dashboard overview
│   │   ├── api/             # API routes
│   │   │   ├── assets/      # Asset CRUD endpoints
│   │   │   ├── incomes/     # Income CRUD endpoints
│   │   │   ├── expenses/    # Expense CRUD endpoints
│   │   │   └── summary/     # Financial summary endpoint
│   │   ├── assets/          # Assets page
│   │   ├── reports/         # Reports page
│   │   └── transactions/    # Transactions page
│   ├── components/          # Shared UI components
│   │   ├── Button/          # Button with variants (primary, outline, danger)
│   │   ├── Modal/           # Reusable modal/dialog component
│   │   ├── DeleteConfirmModal/ # Generic delete confirmation modal
│   │   ├── DeleteTagModal/  # Tag-specific delete confirmation modal
│   │   ├── Tooltip/         # Hover tooltip component
│   │   └── Loading/         # Loading spinner component
│   ├── constants/           # Centralized constants
│   │   ├── assets.ts        # ASSET_CATEGORIES, getAssetCategoryLabel()
│   │   └── income.ts        # INCOME_TYPES, MONTHS, helper functions
│   ├── core/
│   │   └── database/
│   │       ├── client.ts    # Turso database client
│   │       └── migrations/  # SQL migration files
│   ├── features/            # Feature-specific components
│   │   ├── assets/
│   │   ├── expenses/
│   │   │   └── components/
│   │   │       ├── ExpenseForm/            # Add/edit expense form
│   │   │       ├── TransactionDetailsModal/ # Modal for viewing transaction details
│   │   │       ├── TagInput/               # Tag selector/creator with inline actions
│   │   │       └── TagManagementList/      # Centralized tag management for Settings
│   │   └── income/
│   └── utils/               # Utility functions
```

## Code Standards

### Database Schema - Use camelCase

All database field names MUST use camelCase (not snake_case):

```sql
-- CORRECT
CREATE TABLE incomes (
  id INTEGER PRIMARY KEY,
  userId INTEGER NOT NULL,
  amountUsd REAL NOT NULL,
  amountToman REAL NOT NULL,
  exchangeRateUsed REAL NOT NULL,
  incomeType TEXT NOT NULL,
  createdAt TEXT DEFAULT CURRENT_TIMESTAMP
);

-- WRONG (don't use snake_case)
CREATE TABLE incomes (
  user_id INTEGER,
  amount_usd REAL,
  created_at TEXT
);
```

### TypeScript Types

Tag-related types in `src/@types/expense.ts`:

```typescript
export interface Tag { id: number; name: string; created_at: string; }
export interface TagWithUsage extends Tag { usage_count: number; }
export interface UpdateTagInput { name: string; }
export interface Expense { ...; tags?: Tag[]; } // Always optional
```

Use `Tag` for basic ops, `TagWithUsage` for Settings. Keep types in `@types/` directory.

### DRY - Don't Repeat Yourself

**Always use centralized constants** - never duplicate category/type definitions:

```typescript
// CORRECT - Import from constants
import { ASSET_CATEGORIES } from '@/constants/assets';
import { INCOME_TYPES } from '@/constants/income';

const validCategories = ASSET_CATEGORIES.map((c) => c.value);

// WRONG - Don't hardcode arrays
const validCategories = ['cash', 'crypto', 'commodity']; // Never do this!
```

Constants files:

- `src/constants/assets.ts` - `ASSET_CATEGORIES`, `getAssetCategoryLabel()`
- `src/constants/income.ts` - `INCOME_TYPES`, `MONTHS`, `getIncomeTypeLabel()`, `getMonthLabel()`

### UI/UX - Table Alignment

Tables MUST use fixed layout with percentage widths for proper column alignment:

```tsx
<table className="w-full table-fixed border-collapse">
  <thead>
    <tr>
      <th className="w-[35%] ...">Column 1</th>
      <th className="w-[25%] ...">Column 2</th>
      <th className="w-[25%] ...">Column 3</th>
      <th className="w-[15%] ...">Actions</th>
    </tr>
  </thead>
</table>
```

### UI/UX - Auth Pages Design

Auth pages (login, signup, forgot-password) follow a consistent design:

- **Logo**: always the shared `<Logo />` component — never re-create the lockup
- **Subtitle**: "Personal Finance Tracker" in `text-text-tertiary`
- **Card**: `bg-background` with `border-border-subtle` and a subtle shadow
- **Inputs**: Rounded corners, `border-input-border`, focus state `border-input-border-focus`
- **Password fields**: Include eye icon toggle for show/hide
- **Primary buttons**: `bg-button-primary-bg` (cobalt), `text-button-primary-text`, pill-shaped
- **Secondary buttons**: outlined style over `bg-background`
- **Links**: `text-text-primary` with `font-semibold` for strong links, `text-text-tertiary` for muted text
- **Footer links**: Placed outside the card (e.g., "Don't have an account? Sign up")

```tsx
import Logo from '@components/Logo';

// Logo lockup — sizes: sm (nav/footer), md (auth), lg (404), xl (splash)
<Logo size="md" wordmark={t('common.appName')} />

// Primary button
<button className="bg-button-primary-bg hover:bg-button-primary-bg-hover text-button-primary-text w-full rounded-full px-4 py-3 font-medium">
  Sign In
</button>

// Outlined button
<button className="border-button-outline-border bg-background hover:bg-button-outline-bg-hover text-button-outline-text w-full rounded-full border px-4 py-3 font-medium">
  Continue with Demo
</button>
```

**The logo mark** is an **outlined** lightning bolt (Zap) on a cobalt tile, in
`src/components/Logo/ZapBolt.tsx`. It is stroked, not filled — the hollow
interior is the mark's signature. Its path is mirrored by
`scripts/generate-brand-assets.mjs`, which rasterises the favicon, PWA icons and
iOS splash screens. Change the glyph in both places, then re-run
`node scripts/generate-brand-assets.mjs`.

### UI/UX - Page and section primitives

Two shared primitives own the page chrome. Use them instead of re-creating the
markup — that duplication is exactly how padding and font weights drifted apart
before.

- **`src/components/PageHeader`** — the title block every dashboard page opens
  with. One `<h1>` per page lives here, so the outline is always page `<h1>` then
  section `<h2>`s. Pass `action` for a button, filter row or date range; the
  component supplies the `shrink-0` flex wrapper, so don't add your own.
- **`src/components/SectionCard`** — a titled card: icon box, `<h2>`, optional
  subtitle, then your body. Supply the body's own padding (`p-6` for forms,
  nothing for full-bleed tables).

```tsx
<PageHeader title={t('title')} subtitle={t('subtitle')} action={<Button>…</Button>} />

<SectionCard icon={Coins} title={t('title')} subtitle={t('subtitle')}>
  <div className="p-6">…</div>
</SectionCard>
```

### UI/UX - Content width

Every page sits in `mx-auto max-w-[1600px] px-6`, which keeps headers aligned with
the top nav. What varies is the **inner** cap:

- **Forms and preferences** get a reading-width cap — settings panes use
  `max-w-3xl`. Without it a three-toggle card stretches its controls across
  1,300px of empty space, which is what made the old settings page feel sparse.
- **Data and dashboards** stay full width. Tables, charts and stat grids need the
  room, and a nav rail would be the wrong pattern on them.

Card recipe is `border-border-subtle bg-background rounded-xl border shadow-sm`
with `p-5` padding — via `SectionCard` where there's a heading. Uppercase
tracked labels are `text-xs font-medium tracking-wider uppercase` (the
`font-semibold` variant is reserved for `DataTable` column headers).

### UI/UX - Modal Component

Use the reusable Modal component (`src/components/Modal/`) for dialogs and popups:

```tsx
import Modal from '@/components/Modal';

<Modal
  isOpen={isOpen}
  onClose={handleClose}
  title="Modal Title"
  titleFa="عنوان فارسی" // Optional Farsi subtitle
>
  {/* Modal content */}
</Modal>;
```

**Modal features:**

- `bg-card-bg` surface with a `bg-card-header-bg` header
- ESC key to close
- Click outside (backdrop) to close
- Focus management (auto-focuses modal on open)
- Body scroll lock when open
- Responsive padding (smaller on mobile)

**Creating detail modals (like TransactionDetailsModal):**

- Use a `DetailRow` pattern for consistent item layout
- Icon box on left with border and subtle background
- Label (English + Farsi) above the value
- Use dividers (`border-t border-border-subtle`) to group related items
- Handle long text with `break-words`

```tsx
// DetailRow pattern
<div className="flex items-start gap-3 sm:gap-4">
  <div className="border-icon-box-border bg-icon-box-bg flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border">
    <Icon className="text-text-secondary h-4 w-4" />
  </div>
  <div className="min-w-0 flex-1">
    <div className="flex items-center gap-2">
      <span className="text-text-muted text-xs font-medium">Label</span>
      <span className="text-text-muted text-xs" dir="rtl">
        برچسب
      </span>
    </div>
    <div className="text-text-primary mt-1 text-sm font-medium">{value}</div>
  </div>
</div>
```

### UI/UX - Accessibility

Follow these accessibility patterns:

- **Modals**: Use `role="dialog"`, `aria-modal="true"`, `aria-labelledby` for title
- **Decorative icons**: Add `aria-hidden="true"` to icons that don't convey meaning
- **Close buttons**: Include `aria-label="Close modal"`
- **Focus states**: Use visible focus rings (`focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:outline-none`)
- **Semantic HTML**: Use `<time>` with `dateTime` attribute, `role="separator"` for dividers
- **Keyboard navigation**: Support ESC to close modals, Tab for focus navigation

### UI/UX - Mobile Responsiveness

Use responsive Tailwind classes for mobile-first design:

- **Padding**: `px-4 py-3 sm:px-6 sm:py-4` (smaller on mobile)
- **Gaps**: `gap-3 sm:gap-4` or `gap-5 sm:gap-6`
- **Text sizes**: `text-base sm:text-lg` for headings
- **Icon sizes**: `h-9 w-9 sm:h-10 sm:w-10`
- **Flex wrapping**: `flex-wrap` with `gap-x-2 gap-y-1` for bilingual text

```tsx
// Responsive pattern example
<div className="px-4 py-4 sm:px-6 sm:py-5">
  <h2 className="text-base font-semibold sm:text-lg">Title</h2>
</div>
```

### Styling with Tailwind

**IMPORTANT: ALL colors must use theme tokens from `src/styles/globals.css`. NEVER use hardcoded hex colors.**

#### Theme Token Usage

The app uses the **Cobalt** design system: trust-blue as the single chromatic
action colour, over blue-grey neutrals in light mode and **neutral charcoal** in
dark mode.

**Light and dark are tinted differently on purpose.** Light-mode neutrals carry a
cool blue-grey cast; dark-mode surfaces are near-neutral charcoal (channel spread
≤ 4). Tinting the dark surfaces with the brand hue was tried and rejected — it
makes the whole app read blue instead of letting cobalt act as an accent. In dark
mode cobalt appears only on buttons, links, focus rings, active nav and the chart
line. Do not "unify" the two themes by giving dark surfaces a blue tint. Every token is defined once in
`src/styles/globals.css` (`:root` for light, `.dark` for dark) and exposed to
Tailwind through `@theme inline`. There are **no `dark:` variants anywhere in
`src/`** — dark mode works purely by re-declaring token values, so components
never need to know which theme is active.

Hex values below are the light theme; each has a dark counterpart in `.dark`.

**Background Colors:**

- `bg-background` - Cards and raised surfaces (#ffffff)
- `bg-background-content` - Page canvas behind cards (#f3f6fa)
- `bg-background-secondary` - Headers, secondary backgrounds (#f3f6fa)
- `bg-background-elevated` - Hover states, elevated surfaces (#e9eff7)
- `bg-background-hover` - Subtle hover states (#e3ebf5)

**Border Colors:**

- `border-border-subtle` - Default borders (#e2e8f1)
- `border-border-default` - Medium borders (#cfd9e6)
- `border-border-strong` - Strong borders, meets 3:1 (#6f8199)

**Text Colors:**

- `text-text-primary` - Primary text, headings (#0f1b2d)
- `text-text-secondary` - Secondary text (#46586e)
- `text-text-tertiary` - Tertiary text (#556783)
- `text-text-muted` - Muted/subtle text, labels (#6f8199)

**Semantic Colors:**

- `bg-primary` / `text-primary` - Brand cobalt (#1a56db)
- `bg-accent` / `text-accent` - Links, focus, edit affordances (#1a56db). `blue` is a
  back-compat alias for the same value; prefer `accent` in new code
- `bg-success` / `text-success` - Money in, success states (#0e7a3e)
- `bg-danger` / `text-danger` - Error/danger states (#c81e1e)
- `bg-warning` / `text-warning` - Amber warning states (#8a5a06)
- `bg-info` / `text-info` - Info states (#7028cc)

Each semantic colour also has a `-light` tint (for filled callouts) and a
`-foreground` (the readable colour to place **on** the filled colour, e.g.
`bg-warning text-warning-foreground`). Never pair a semantic fill with
`text-white` — it fails contrast in dark mode where the fills are bright.

**Component-Specific Tokens:**

- Buttons: `bg-button-primary-bg`, `hover:bg-button-primary-bg-hover`, etc.
- Actions: `text-action-default`, `hover:bg-action-edit-bg-hover`, `hover:text-action-delete-text-hover`
- Inputs: `bg-input-bg`, `border-input-border`, `focus:border-input-border-focus`
- Tags: `bg-tag-bg`, `text-tag-text`, `border-tag-border`
- Cards: `bg-card-bg`, `bg-card-header-bg`, `border-card-border`
- Categories: `--color-cat-*` (16 hues). The **keys are persisted per user in the
  database** — hues may be retuned, but never rename or remove one without a migration.

**Shape language:**

- Radius scale is declared unlayered in `:root`, deliberately overriding Tailwind's
  own `--radius-*` defaults: `rounded-sm` 8px → `rounded-lg` 14px → `rounded-2xl` 20px
- Buttons, badges and chips are **pill-shaped** (`rounded-full`)
- Hierarchy comes from 1px borders and surface tints; shadows stay near-flat

**Rules:**

1. **NEVER use hardcoded colors** like `bg-[#171717]` or `text-[#ea001d]`
2. **Always use theme tokens** for all color values
3. **To add a new color:** Add it to `src/styles/globals.css` first, expose it in `@theme inline`, then use it
4. **Verify contrast** for any new pair: body text 4.5:1, UI boundaries 3:1, in **both** themes
5. The only legitimate hex literals live where CSS variables cannot reach:
   `src/emails/colors.ts`, `src/app/opengraph-image.tsx`, `src/app/global-error.tsx`,
   `src/app/manifest.ts`, `layout.tsx`'s `themeColor`, and canvas particle colours

### UI/UX - Rendering a category

A category is drawn **two** ways, and which one you use is decided by what the
surface is for — not by taste. Reach for one of these; never hand-roll a third.

- **`src/components/CategoryBadge`** — a tinted pill (icon + name). Use it where
  a category is **read**: the expenses table, the details drawer, the chart
  legend, the delete-modal preview, live previews in the editors. A scanned
  column of tinted pills lets colour do the sorting, which is the fastest cue
  in a dense table.
- **`src/components/CategoryTile`** — a tinted icon tile followed by the name.
  Use it where a category is **picked**: the expense form's category select
  (options + chosen value), the expenses-table filter, the reports filter
  popover, the settings list, the delete-modal reassign rows. Names stay
  left-aligned on one grid so the eye runs straight down them; sixteen stacked
  pills read as confetti and sort nothing.

`CategoryTile` takes `size` (`sm` for menus, `md` for the settings list),
`emphasis` for the active row, and `subtitle` for a secondary line such as a
usage count.

This rule exists because the same category was once drawn eight different ways
across the app, with three different icon sizes and three surfaces (the chart
legend and both filter selects) that dropped the icon and colour altogether.
When auditing this, search for consumers of `getCategoryListKeyGenerator` and
for plain `{ value, label }` option lists — grepping for `getCategoryIcon` only
finds the surfaces that already draw one.

### UI/UX - Icon Consistency

**ALWAYS use these standardized icons from lucide-react:**

- **Edit/Rename**: `Edit2` (never use `Edit`, `Pencil`, or other variants)
- **Delete/Remove**: `Trash2` (never use `Trash`, `Delete`, or `X` for delete actions)
- **Close/Cancel**: `X`
- **Save/Confirm**: `Check`
- **Add/Create**: `Plus`
- **Loading**: `Loader2` with `animate-spin`

```tsx
import { Check, Edit2, Loader2, Plus, Trash2, X } from 'lucide-react';
```

### UI/UX - Action Button Patterns

All action buttons (edit, delete, save, cancel) MUST use this standardized clean style:

```tsx
// Edit button (blue hover) - uses theme tokens
<button
  onClick={handleEdit}
  className="rounded-lg p-2 text-action-default transition-all duration-200 hover:bg-action-edit-bg-hover hover:text-action-edit-text-hover"
  title="Edit"
>
  <Edit2 className="h-4 w-4" />
</button>

// Delete button (red hover) - uses theme tokens
<button
  onClick={handleDelete}
  className="rounded-lg p-2 text-action-default transition-all duration-200 hover:bg-action-delete-bg-hover hover:text-action-delete-text-hover"
  title="Delete"
>
  <Trash2 className="h-4 w-4" />
</button>

// Save button (green hover) - uses theme tokens
<button
  onClick={handleSave}
  disabled={isSaving}
  className="rounded-lg p-2 text-action-default transition-all duration-200 hover:bg-action-save-bg-hover hover:text-action-save-text-hover disabled:opacity-50"
  title="Save"
>
  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
</button>

// Cancel button (gray hover) - uses theme tokens
<button
  onClick={handleCancel}
  className="rounded-lg p-2 text-action-default transition-all duration-200 hover:bg-action-cancel-bg-hover hover:text-action-cancel-text-hover"
  title="Cancel"
>
  <X className="h-4 w-4" />
</button>
```

**Action Button Guidelines:**

- NO borders (borderless design for cleaner look)
- Use `p-2` padding (not fixed width/height like `h-9 w-9`)
- Start with `text-action-default` (muted state)
- Hover shows colored background (10% opacity) + colored icon
- Always include `title` attribute for accessibility
- Always include `aria-label` for screen readers
- Use `disabled:opacity-50` for disabled states

### UI/UX - Delete Confirmation Pattern

**IMPORTANT: Never use browser `confirm()` or `alert()` dialogs.** Always use custom modal components for better UX.

For general destructive actions, use the `DeleteConfirmModal` component:

```tsx
import DeleteConfirmModal from '@/components/DeleteConfirmModal';

const [itemToDelete, setItemToDelete] = useState<Item | null>(null);
const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
const [deletingId, setDeletingId] = useState<number | null>(null);

const openDeleteModal = (item: Item) => {
  setItemToDelete(item);
  setIsDeleteModalOpen(true);
};

const closeDeleteModal = () => {
  setItemToDelete(null);
  setIsDeleteModalOpen(false);
};

const confirmDelete = async () => {
  if (!itemToDelete) return;

  setDeletingId(itemToDelete.id);

  try {
    const response = await fetch(`/api/items/${itemToDelete.id}`, { method: 'DELETE' });
    if (response.ok) {
      setItems((prev) => prev.filter((item) => item.id !== itemToDelete.id));
      closeDeleteModal();
    }
  } catch {
    alert('Failed to delete item'); // Only use alert for error messages
  } finally {
    setDeletingId(null);
  }
};

// In JSX
<button onClick={() => openDeleteModal(item)}>
  <Trash2 className="h-4 w-4" />
</button>

<DeleteConfirmModal
  isOpen={isDeleteModalOpen}
  title="Delete item"
  message="Are you sure you want to delete this item? This action cannot be undone."
  itemName={itemToDelete?.name}
  onConfirm={confirmDelete}
  onCancel={closeDeleteModal}
  isDeleting={deletingId === itemToDelete?.id}
/>
```

**DeleteConfirmModal Props:**

- `isOpen: boolean` - Controls modal visibility
- `title: string` - Modal title (e.g., "Delete expense")
- `message: string` - Confirmation message explaining consequences
- `itemName?: string` - Optional item name to show in title (e.g., "Delete expense 'Groceries'?")
- `onConfirm: () => void` - Function to call when user confirms deletion
- `onCancel: () => void` - Function to call when user cancels
- `isDeleting?: boolean` - Shows loading state during deletion

**For tag-specific deletions** with usage counts, use `DeleteTagModal`:

```tsx
import DeleteTagModal from '@/components/DeleteTagModal';

<DeleteTagModal
  isOpen={!!deletingTag}
  tag={deletingTag}
  usageCount={deletingTag?.usage_count || 0}
  onConfirm={confirmDelete}
  onCancel={() => setDeletingTag(null)}
  isDeleting={isDeleting}
/>;
```

**Guidelines:**

- Always show clear consequences of deletion in the message
- Use `text-danger` / `bg-button-danger-bg` for delete buttons
- Disable modal close during deletion (prevents accidental dismissal)
- Show loading state in confirmation button during deletion
- Only use browser `alert()` for error messages, never for confirmations

### UI/UX - Inline Editing Pattern

For inline editing (renaming):

```tsx
const [editingId, setEditingId] = useState<number | null>(null);
const [editingName, setEditingName] = useState('');
const [editError, setEditError] = useState('');

const saveEdit = async (id: number) => {
  if (!editingName.trim()) return setEditError('Name required');

  const isDuplicate = items.some(
    (item) => item.id !== id && item.name.toLowerCase() === editingName.trim().toLowerCase()
  );
  if (isDuplicate) return setEditError(`"${editingName.trim()}" exists`);

  const res = await fetch(`/api/items/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ name: editingName.trim() }),
  });
  if (res.ok) setItems((prev) => prev.map((i) => (i.id === id ? await res.json() : i)));
};

// Keyboard: Enter saves, Escape cancels
<input
  value={editingName}
  onChange={(e) => setEditingName(e.target.value)}
  onKeyDown={(e) => (e.key === 'Enter' ? saveEdit(id) : e.key === 'Escape' && cancelEdit())}
  autoFocus
  className="border-accent rounded border px-2 py-1 text-sm outline-none"
/>;
{
  editError && <p className="text-danger text-xs">{editError}</p>;
}
```

**Guidelines:** Enter/Escape keys, auto-focus, accent border, case-insensitive duplicate check, trim values

## API Routes

### Expenses

- `GET /api/expenses` - List expenses with optional date filters
- `POST /api/expenses` - Create expense
- `GET /api/expenses/[id]` - Get single expense
- `PUT /api/expenses/[id]` - Update expense
- `DELETE /api/expenses/[id]` - Delete expense

Expense create/update accept an optional `repeat` object (`frequency`, `intervalCount`, `calendar`,
`endDate`); `null` means "doesn't repeat" and is how a repeat is removed. Reads return the live
`repeat` alongside `recurringId`. There are deliberately **no** `/api/recurring` routes.

### Incomes

- `GET /api/incomes` - List incomes with optional year/month filters
- `POST /api/incomes` - Create income entry
- `GET /api/incomes/[id]` - Get single income
- `PUT /api/incomes/[id]` - Update income
- `DELETE /api/incomes/[id]` - Delete income

### Assets

- `GET /api/assets` - List all assets (optionally filter by category)
- `POST /api/assets` - Create asset (also creates initial valuation snapshot)
- `GET /api/assets/[id]` - Get asset with valuation history
- `PUT /api/assets/[id]` - Update asset (creates valuation snapshot if value changed)
- `DELETE /api/assets/[id]` - Delete asset and valuations

### Tags

- `GET /api/tags` - List all tags for current user (supports `?includeUsage=true` for usage counts)
- `POST /api/tags` - Create new tag (returns existing if duplicate)
- `PUT /api/tags/[id]` - Update tag name (validates for duplicates)
- `DELETE /api/tags/[id]` - Delete tag (CASCADE removes from all expenses)

**Tag API Usage:**

```typescript
// GET with counts: /api/tags?includeUsage=true → [{ id, name, created_at, usage_count }]
// POST: Returns existing if duplicate (case-insensitive)
// PUT: Returns 409 if duplicate exists
// DELETE: Returns { success, usageCount }, CASCADE removes from expense_tags
```

### Summary

- `GET /api/summary` - Financial overview (current month income/expenses, total assets, net worth, charts data)

## Database Schema

### Database Relationships and CASCADE DELETE

The database uses CASCADE DELETE to maintain referential integrity:

**Tags System:**

```sql
-- Tags table with unique constraint per user
CREATE TABLE tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(user_id, name)
);

-- Junction table with CASCADE on both foreign keys
CREATE TABLE expense_tags (
  expense_id INTEGER NOT NULL,
  tag_id INTEGER NOT NULL,
  PRIMARY KEY (expense_id, tag_id),
  FOREIGN KEY (expense_id) REFERENCES expenses(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);
```

**CASCADE DELETE Behavior:**

- Deleting a user → deletes all their tags, expenses, assets, etc.
- Deleting an expense → removes all tag associations in `expense_tags`
- Deleting a tag → removes all expense associations in `expense_tags`
- No orphaned records in junction tables

**Important:**

- Database handles CASCADE automatically
- Application layer only needs to delete the parent record
- No manual cleanup of junction table entries required
- Always fetch usage counts BEFORE deletion for user feedback

### users table

```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

### incomes table

```sql
CREATE TABLE incomes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  userId INTEGER NOT NULL,
  amountUsd REAL NOT NULL,
  amountToman REAL NOT NULL,
  exchangeRateUsed REAL NOT NULL,
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  incomeType TEXT NOT NULL,
  source TEXT,
  notes TEXT,
  createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
  updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
);
```

### assets table

```sql
CREATE TABLE assets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  userId INTEGER NOT NULL,
  category TEXT NOT NULL,
  name TEXT NOT NULL,
  quantity REAL NOT NULL DEFAULT 1,
  unit TEXT,
  unitValueUsd REAL,
  totalValueUsd REAL NOT NULL,
  totalValueToman REAL NOT NULL,
  exchangeRateUsed REAL NOT NULL,
  notes TEXT,
  lastValuedAt TEXT NOT NULL,
  createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
  updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
);
```

### assetValuations table

```sql
CREATE TABLE assetValuations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  assetId INTEGER NOT NULL,
  quantity REAL NOT NULL,
  unitValueUsd REAL,
  totalValueUsd REAL NOT NULL,
  totalValueToman REAL NOT NULL,
  exchangeRateUsed REAL NOT NULL,
  valuedAt TEXT NOT NULL,
  createdAt TEXT DEFAULT CURRENT_TIMESTAMP
);
```

## Configuration

### TypeScript

- Target: ES2017
- Strict mode: enabled
- Path alias: `@/*` maps to `src/*`

### Database (Turso/libSQL)

Environment variables in `.env.local`:

- `TURSO_DATABASE_URL`: Connection URL
- `TURSO_AUTH_TOKEN`: Authentication token

### ESLint

- `eslint-config-next/core-web-vitals`
- `eslint-config-next/typescript`

## Important Conventions

- Always use `pnpm` for package management
- Follow Next.js 16 App Router conventions
- TypeScript strict mode - all code must pass type checking
- Database fields use camelCase
- Reuse constants from `src/constants/` - never hardcode categories/types
- Tables use `table-fixed` with percentage widths for alignment
- Bilingual support: English labels with Persian (Farsi) translations
- Commits follow Conventional Commits (enforced by commitlint) - see Releases below

## Releases

Kharji follows SemVer. **[RELEASING.md](RELEASING.md) is the full process** - read it before
cutting a release. The essentials:

- Commit messages are Conventional Commits, enforced by commitlint via `.husky/commit-msg`.
  `fix:` → patch, `feat:` → minor, `feat!:`/`BREAKING CHANGE:` → major.
- **Two changelogs, two audiences.** Never conflate them:
  - `CHANGELOG.md` is **generated** by `release-it` from commit subjects. Never hand-edit it.
  - `src/content/releases/*.json` is **hand-written**, bilingual (en + fa), user-facing, and is
    what the `/changelog` page renders. It never reads `CHANGELOG.md`.
- Cutting a release, in this order (the notes must be committed first - `release-it` requires a
  clean working directory):

  ```bash
  # 1. add src/content/releases/<version>.json (both `en` and `fa` required)
  # 2. register it in src/content/releases/index.ts, newest first
  pnpm test                   # validates notes: semver, dates, no missing `fa`
  git commit -m "docs: add v<version> release notes"
  pnpm release:dry            # preview
  pnpm release                # bump + CHANGELOG.md + commit + tag
  git push --follow-tags      # triggers .github/workflows/release.yml
  ```

- `package.json` version must equal the newest entry in `src/content/releases/`, or the one before
  it while a release is pending (notes are committed first, then `pnpm release` bumps it) - a test
  enforces this.
- Adding a release requires **no** database work; release notes are static files.

## Component Patterns

### DeleteConfirmModal Component

The `DeleteConfirmModal` component (`src/components/DeleteConfirmModal/`) provides a consistent, accessible way to confirm destructive actions throughout the app.

**Usage Examples:**

```tsx
// Transactions page
<DeleteConfirmModal
  isOpen={isDeleteModalOpen}
  title="Delete expense"
  message="Are you sure you want to delete this expense? All associated data will be removed."
  itemName={expenseToDelete?.description}
  onConfirm={confirmDelete}
  onCancel={closeDeleteModal}
  isDeleting={deletingId === expenseToDelete?.id}
/>

// Assets page
<DeleteConfirmModal
  isOpen={isDeleteModalOpen}
  title="Delete asset"
  message="Are you sure you want to delete this asset? All valuation history will be removed."
  itemName={assetToDelete?.name}
  onConfirm={confirmDelete}
  onCancel={closeDeleteModal}
  isDeleting={deletingId === assetToDelete?.id}
/>

// Income page (with dynamic itemName)
<DeleteConfirmModal
  isOpen={isDeleteModalOpen}
  title="Delete income"
  message="Are you sure you want to delete this income entry?"
  itemName={
    incomeToDelete
      ? `${getMonthLabel(incomeToDelete.month).en} ${incomeToDelete.year} - ${getIncomeTypeLabel(incomeToDelete.incomeType).en}`
      : undefined
  }
  onConfirm={confirmDelete}
  onCancel={closeDeleteModal}
  isDeleting={deletingId === incomeToDelete?.id}
/>
```

**Features:**

- Warning icon in `text-danger`
- Dynamic title with optional item name
- Clear consequences message
- "This action cannot be undone" warning
- Loading state during deletion
- Prevents close during deletion
- Accessible keyboard support

### Button Component

The `Button` component (`src/components/Button/`) supports three variants:

```tsx
import Button from '@/components/Button';

// Primary button (black background, white text)
<Button variant="primary" onClick={handleClick}>
  Save Changes
</Button>

// Outline button (white background, bordered)
<Button variant="outline" onClick={handleClick}>
  Cancel
</Button>

// Danger button (outlined with red hover)
<Button variant="danger" onClick={handleClick}>
  Delete All Data
</Button>
```

**Button Variant Styles:**

- **primary**: `bg-button-primary-bg hover:bg-button-primary-bg-hover text-button-primary-text` (pill)
- **outline**: `bg-background hover:bg-button-outline-bg-hover border border-button-outline-border text-button-outline-text hover:text-button-outline-text-hover`
- **danger**: `bg-background hover:bg-danger/10 border border-button-outline-border hover:border-danger text-button-outline-text hover:text-danger`

**Note:** For solid red/danger buttons (like delete confirmations), override with custom classes:

```tsx
<Button variant="primary" className="bg-button-danger-bg hover:bg-button-danger-bg-hover">
  Delete Tag
</Button>
```

### Toast Component

The `Toast` component (`src/components/Toast/`) provides the notification system for displaying success, error, warning, and info messages to users.

**Usage:**

```tsx
import { useToast } from '@/components/Toast/ToastProvider';

function MyComponent() {
  const { showToast } = useToast();

  const handleAction = async () => {
    try {
      await someAction();
      showToast('Action completed successfully!', 'success');
    } catch {
      showToast('Something went wrong', 'error');
    }
  };

  return <button onClick={handleAction}>Do Something</button>;
}
```

**Toast Types:**

- `success` - Success-green toast with CheckCircle icon
- `error` - Red toast with XCircle icon
- `warning` - Amber toast with AlertTriangle icon
- `info` - Cobalt accent toast with Info icon

**Features:**

- Auto-dismisses after 5 seconds
- Manual close button (X icon)
- Slide-up animation from bottom-right
- Responsive positioning
- Stacks multiple toasts vertically
- Accessible keyboard support

**Guidelines:**

- Use `success` for completed actions (profile updated, item created)
- Use `error` for failures (validation errors, server errors)
- Use `warning` for non-blocking issues (deprecated features, warnings)
- Use `info` for informational messages (no changes detected)
- Keep messages concise (1-2 sentences max)
- Always wrap app with `ToastProvider` in root layout

### Next.js 16 API Route Patterns

In Next.js 16, route `params` are now async and must be awaited:

```typescript
// CORRECT - Next.js 16
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tagId = parseInt(id, 10);
  // ... rest of handler
}

// WRONG - Old Next.js pattern
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const tagId = parseInt(params.id, 10); // TypeScript error!
  // ...
}
```

**Always:**

- Type `params` as `Promise<{ param: string }>`
- Await params before using: `const { id } = await params;`
- Parse route parameters immediately after awaiting
