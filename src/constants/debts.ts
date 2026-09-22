import type { DebtDirection } from '@/@types/debt';

/**
 * The two ends of the same question — «طلب و بدهی».
 *
 * `icon` and `color` are spelled in the CATEGORY REGISTRY's vocabulary
 * (`getCategoryIcon` / `getCategoryColor` keys in ./categories), not as raw
 * components or hexes, so `CategoryTile` and `CategoryBadge` resolve them the
 * same way they resolve a spending category. `SPENDABLE_ASSET_TILE` made the
 * same choice for the same reason.
 *
 * The colours are not decoration: red already means "money out" on every
 * expense amount in the app and green means "money in" on income, so a debt
 * you owe is red and one owed to you is green. Anything else would make the
 * debts page the one screen where those two colours mean something new.
 */
export const DEBT_DIRECTIONS = [
  { value: 'payable', label: 'I owe', labelFa: 'بدهکارم', icon: 'ArrowUpRight', color: 'red' },
  { value: 'receivable', label: 'Owed to me', labelFa: 'طلبکارم', icon: 'ArrowDownLeft', color: 'green' },
] as const;

export const DEBT_DIRECTION_VALUES = ['payable', 'receivable'] as const;

/**
 * The WHERE fragment every debt aggregate must carry.
 *
 * Exported as one constant rather than spelled inline, because a settled debt
 * has already moved whatever balance it was going to move — counting it again
 * in the summary is the single way this feature can corrupt net worth. A
 * future third aggregate that forgets this clause would do exactly that.
 */
export const OUTSTANDING_DEBTS_WHERE = 'settledAt IS NULL';

export function getDebtDirectionLabel(direction: string): { en: string; fa: string; icon: string; color: string } {
  const found = DEBT_DIRECTIONS.find((d) => d.value === direction);
  if (!found) return { en: direction, fa: direction, icon: 'Folder', color: 'gray' };
  return { en: found.label, fa: found.labelFa, icon: found.icon, color: found.color };
}

export function isDebtDirection(value: string): value is DebtDirection {
  return DEBT_DIRECTION_VALUES.includes(value as DebtDirection);
}
