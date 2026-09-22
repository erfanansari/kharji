-- Migration 023: linking a receivable to the expense it was born from
--
-- The debts feature (022) shipped standalone: a debt is a fact you type from
-- scratch. Real usage showed that undersells the common case — someone pays
-- the full bill for a shared lunch, and part of it is owed back. That is not
-- a fact you type from scratch, it is a fact about an expense you already
-- typed. Splitwise's own reimbursement flow works the same way: "add the
-- expense as usual, then mark part of it as coming back to you" — the expense
-- stays the source of truth, and the debt is derived from it.
--
-- So this migration adds ONE optional link, nothing else. A standalone loan
-- (money lent with no purchase behind it, e.g. lending your brother cash)
-- still has expenseId = NULL and works exactly as it did in 022. A debt born
-- from "part of this expense comes back to me" gets it set at creation time,
-- by POST /api/expenses, in the same request that creates the expense.
--
-- Direction is not constrained here (no CHECK — house rule, see 022). In
-- practice only 'receivable' is ever created this way by the UI: an unpaid
-- bill (a payable) is money that has NOT left your account yet, which is a
-- different, still-unsolved problem (see Arash's original report) — recording
-- it as an expense at all would misuse what an expense means in this schema.
ALTER TABLE debts ADD COLUMN expenseId INTEGER REFERENCES expenses(id) ON DELETE SET NULL;

-- NOTE: nothing issues `PRAGMA foreign_keys = ON` (see 021, 022) — deleting an
-- expense does not, by itself, null this column. DELETE /api/expenses/[id]
-- must do it explicitly, the same way asset deletion cleans up paidFrom* and
-- settled*. The expense is one input to the debt, not its owner: deleting the
-- expense must not delete the fact that money is owed — that money is still
-- owed regardless of whether the original grocery-run row survives.

-- Two lookups: "does this expense already have a reimbursement" (the marker
-- shown on the expense row, and the guard against creating a second one) and
-- "which debt is this" when rendering the debts page. Partial, because most
-- debts have no linked expense.
CREATE INDEX IF NOT EXISTS idxDebtsExpense ON debts(expenseId) WHERE expenseId IS NOT NULL;
