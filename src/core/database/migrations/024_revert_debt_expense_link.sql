-- Migration 024: revert 023 (the debt<->expense link)
--
-- 023 added debts.expenseId for "part of this expense comes back to me" —
-- creating a receivable straight from the expense form. On review the debts
-- tab was meant to stay the one place a debt is created and managed,
-- independent of how it came to exist; the expense-side shortcut cut against
-- that and is being pulled before anyone relied on it.
--
-- Safe to drop outright rather than leave nullable and unused: verified
-- read-only against the live database before this migration was written —
-- zero debts rows had expenseId set. Nothing is lost.
DROP INDEX IF EXISTS idxDebtsExpense;
ALTER TABLE debts DROP COLUMN expenseId;
