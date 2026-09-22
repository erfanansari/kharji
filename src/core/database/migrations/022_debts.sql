-- Migration 022: debts — money owed, in both directions
--
-- Two users asked for this independently, in the same words: «یه بخش طلب و
-- بدهی». طلب and بدهی are one question read from two ends, so this is ONE
-- table with a direction column, not two tables. Splitting them would
-- duplicate the settle path, the three settlement columns and the summary
-- query — three chances to fix a bug in one half and not the other.
--
-- Why a table and not a flag on `expenses`. The motivating report was an
-- expense already recorded ("I paid for my motorcycle" — except he hadn't),
-- which makes a flag look tempting. But the other half of the same feature is
-- lending your brother 7M, which is not an expense and never will be: no money
-- left, nothing was consumed, and it is owed back. A flag has nowhere to put
-- that row. v1 therefore keeps debts standalone with NO foreign key to
-- expenses — a link is additive later, an entangled schema is not.
--
-- What this migration changes the MEANING of: net worth. Until now
-- `net_worth` in /api/summary was literally SUM(assets), because the schema
-- had no liabilities in it at all. From here it is assets − payable +
-- receivable, counting OUTSTANDING rows only. The gross figure survives as
-- `total_assets`, which is what the assets page shows.

CREATE TABLE IF NOT EXISTS debts (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  userId          INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- 'payable' = I owe it. 'receivable' = it is owed to me.
  -- Accounting vocabulary on purpose: 'owe' and 'owed' differ by one character
  -- and are unreadable in a WHERE clause six months from now.
  -- No CHECK constraint — house rule, enums live in src/constants/debts.ts and
  -- zod, the same as recurringExpenses.frequency and feedback.type.
  direction       TEXT    NOT NULL,

  -- Free text. Deliberately not a FK to a contacts table: there is no contacts
  -- table, and inventing one to hold «برادرم» would be three screens of CRUD
  -- for a string. The form offers past counterparties from the cached list,
  -- which gets the autocomplete without the entity.
  counterparty    TEXT    NOT NULL,

  amount          REAL    NOT NULL,
  currency        TEXT    NOT NULL,
  entryRate       REAL    NOT NULL,  -- frozen pivot rate, getEntryRateOn(incurredAt)

  -- The day the debt came into being, which is usually NOT today: the bill you
  -- are recording is one you already received. Every money row in this schema
  -- converts at its OWN date (see sumInCurrency in /api/summary); without this
  -- column a debt would convert at today's rate and drift from everything else.
  incurredAt      TEXT    NOT NULL,  -- yyyy-MM-dd
  dueDate         TEXT,              -- yyyy-MM-dd; NULL = no agreed date
  note            TEXT,

  -- NULL = still outstanding. A timestamp rather than a boolean, following
  -- users.onboarded_at (migration 014): the timestamp IS the flag, it answers
  -- "when" for free, and `WHERE settledAt IS NULL` is a partial-index
  -- predicate that a boolean cannot beat.
  settledAt       TEXT,

  -- What settling actually moved, if anything. All three NULL = bookkeeping
  -- only, which is the default and the common case — «فقط جهت حساب کتاب», as
  -- the original report put it.
  --
  -- These mirror expenses.paidFrom* (migration 021) and exist for exactly the
  -- same reason: reversing a settlement must add back the number that was
  -- subtracted, not recompute it. Recomputing would use whatever rate is
  -- current at reversal time and leave the balance permanently off by the
  -- drift, which compounds across edits. And because an asset's currency is
  -- editable via PUT /api/assets/[id], a bare delta is ambiguous — without
  -- settledCurrency, reversal could credit a dollar figure into a toman
  -- balance. On a mismatch it refuses rather than guessing.
  --
  -- NOTE: nothing issues `PRAGMA foreign_keys = ON` (it defaults OFF per
  -- connection in SQLite), so ON DELETE SET NULL here may never fire — exactly
  -- as for expenses.paidFromAssetId. DELETE /api/assets/[id] nulls these
  -- columns explicitly, via buildAccountCleanupStatements, and does not rely
  -- on it.
  settledAssetId  INTEGER REFERENCES assets(id) ON DELETE SET NULL,

  -- SIGNED, in settledCurrency. Positive = money left the account (a payable
  -- you paid); negative = money arrived (a receivable you collected). The sign
  -- is the direction because the balance SQL always SUBTRACTS this number —
  -- see the sign-convention block in src/core/database/account-balance.ts.
  -- That is what lets receivables reuse the whole reversal/resync machinery
  -- with no extra SQL.
  settledDelta    REAL,
  settledCurrency TEXT,

  createdAt       TEXT DEFAULT CURRENT_TIMESTAMP,
  updatedAt       TEXT DEFAULT CURRENT_TIMESTAMP
);

-- The page reads everything for one user, grouped by direction.
CREATE INDEX IF NOT EXISTS idxDebtsUser ON debts(userId, direction, incurredAt);

-- The summary sums OUTSTANDING rows only, and the page sorts them by what is
-- due soonest. Partial, because a long-lived account is mostly settled history
-- and none of it belongs in this index.
CREATE INDEX IF NOT EXISTS idxDebtsOutstanding
  ON debts(userId, direction, dueDate) WHERE settledAt IS NULL;

-- Only lookup: "which debts point at this account", during account deletion.
CREATE INDEX IF NOT EXISTS idxDebtsSettledAsset
  ON debts(settledAssetId) WHERE settledAssetId IS NOT NULL;

-- assetValuations.source gains a fourth value, 'debt', with NO DDL — the
-- column has no CHECK constraint (migration 021 added it as documentation).
-- The full vocabulary is now:
--   NULL    - written before 021, provenance unknown
--   manual  - POST /api/assets, PUT /api/assets/[id]
--   revalue - POST /api/assets/revalue
--   expense - an expense was deducted from, or reversed out of, this account
--   debt    - a debt was settled through, or unsettled out of, this account
--
-- ── Partial settlement is deliberately out of scope for v1 ─────────────────
-- Both reports describe a binary act — «هرموقع تایید کردم بزنه بدهی پرداخت
-- شده». Neither asks to log instalments, and partial settlement cannot reuse
-- the three columns above: each instalment applies at its own rate, so a
-- mutable `paidAmount` would break the store-the-applied-delta invariant the
-- moment a second payment lands at a different rate.
--
-- The honest shape for it is a child table —
--   debtPayments(debtId, amount, currency, entryRate, paidAt,
--                paidFromAssetId, paidFromDelta, paidFromCurrency)
-- with settledAt becoming derived. NOTHING HERE BLOCKS THAT: the three
-- settlement columns are exactly one payment's worth and backfill into such a
-- table as a single row. v2 does not need to migrate around v1.
--
-- Until then the escape hatch already exists and is supported: someone who
-- paid half edits the debt down to the remainder, which resyncs the moved
-- balance correctly through buildResyncStatements.
