// Bulk revaluation planning: given the user's assets and today's rates, work
// out what "Update Values" should change. Pure — no clock, no I/O — so the
// route and the tests exercise exactly the same decisions.
//
// Three revalue semantics, by what the asset's stored numbers mean:
//
// - `price` — linked assets (assets.linkedItem): the tracked item's current
//   price is the truth → unitValue = price in the asset's currency,
//   amount = quantity × unitValue.
// - `rate` — unlinked foreign-currency assets: the stored amount is the user's
//   truth → only entryRate re-snapshots to today's rate (identity invariant:
//   the amount in the asset's own currency never changes).
// - `date` — unlinked pivot-currency assets: amount and entryRate (always 1)
//   are both already right, but the value in every *other* currency is read at
//   the rate of the valuation date. Left alone, a Toman-valued car keeps
//   showing the dollar figure from the day it was last edited while everything
//   around it moves to today's rate. Re-dating the valuation is what brings its
//   converted value forward.
import type { Asset } from '@types';

import type { LatestRates } from '@features/ExchangeRate/utils/currency';

import { getCurrency, PIVOT_CURRENCY } from '@/constants/currencies';
import { getTrackedItem } from '@/constants/tracked-items';

export interface RevalueValues {
  amount: number;
  unitValue: number | null;
  entryRate: number;
}

export type RevalueKind = 'price' | 'rate' | 'date';

export interface RevalueChange {
  id: number;
  name: string;
  currency: string;
  linkedItem: string | null;
  kind: RevalueKind;
  /** YYYY-MM-DD the asset was last valued on, before this revalue. */
  previousValuedAt: string;
  old: RevalueValues;
  next: RevalueValues;
}

export type RevalueSkipReason = 'no-rate' | 'no-price' | 'no-quantity' | 'unchanged';

export interface RevalueSkip {
  id: number;
  name: string;
  reason: RevalueSkipReason;
}

export interface RevaluePlan {
  changes: RevalueChange[];
  skipped: RevalueSkip[];
}

type RevaluableAsset = Pick<
  Asset,
  'id' | 'name' | 'currency' | 'linkedItem' | 'quantity' | 'amount' | 'unitValue' | 'entryRate' | 'lastValuedAt'
>;

const roundTo = (value: number, decimals: number): number => {
  const f = 10 ** decimals;
  return Math.round(value * f) / f;
};

/**
 * @param latest latest rate per currency / tracked item, in pivot units
 * @param today  YYYY-MM-DD — the day the revalue runs on
 */
export function planRevalue(assets: RevaluableAsset[], latest: LatestRates, today: string): RevaluePlan {
  const changes: RevalueChange[] = [];
  const skipped: RevalueSkip[] = [];

  for (const asset of assets) {
    const skip = (reason: RevalueSkipReason) => skipped.push({ id: asset.id, name: asset.name, reason });

    const isPivot = asset.currency === PIVOT_CURRENCY;
    const currencyRate = isPivot ? 1 : latest[asset.currency];
    const linked = getTrackedItem(asset.linkedItem);
    const previousValuedAt = (asset.lastValuedAt ?? '').slice(0, 10);
    const old: RevalueValues = { amount: asset.amount, unitValue: asset.unitValue, entryRate: asset.entryRate };

    if (currencyRate == null || currencyRate <= 0) {
      skip('no-rate');
      continue;
    }

    const base = { id: asset.id, name: asset.name, currency: asset.currency, linkedItem: asset.linkedItem };

    if (!linked && isPivot) {
      // Idempotency: already dated today (e.g. a second click) → nothing to do.
      if (previousValuedAt >= today) {
        skip('unchanged');
        continue;
      }
      changes.push({ ...base, kind: 'date', previousValuedAt, old, next: { ...old } });
      continue;
    }

    const decimals = getCurrency(asset.currency).decimals;
    let next: RevalueValues;

    if (linked) {
      const priceToman = latest[linked.code];
      if (priceToman == null || priceToman <= 0) {
        skip('no-price');
        continue;
      }
      if (!(asset.quantity > 0)) {
        skip('no-quantity');
        continue;
      }
      const unitValue = roundTo(priceToman / currencyRate, decimals);
      next = { amount: roundTo(asset.quantity * unitValue, decimals), unitValue, entryRate: currencyRate };
    } else {
      next = { amount: asset.amount, unitValue: asset.unitValue, entryRate: currencyRate };
    }

    // Idempotency: identical post-rounding values (e.g. a second click the
    // same day) must not write rows or spam valuation snapshots.
    if (next.amount === old.amount && next.entryRate === old.entryRate && next.unitValue === old.unitValue) {
      skip('unchanged');
      continue;
    }

    changes.push({ ...base, kind: linked ? 'price' : 'rate', previousValuedAt, old, next });
  }

  return { changes, skipped };
}
