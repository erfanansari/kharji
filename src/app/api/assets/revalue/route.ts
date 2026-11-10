import { NextResponse } from 'next/server';

import { withAuth } from '@core/api/utils';
import { planRevalue } from '@core/assets/revalue';
import { db } from '@core/database/client';
import { mapRowToAsset } from '@core/database/mappers';
import { ensureFreshRates, getLatestRates } from '@core/rates';

// POST /api/assets/revalue — bulk-revalue the user's assets at current rates.
// What changes, and why, is decided by planRevalue (src/core/assets/revalue.ts).
//
// Body { dryRun: true } returns the computed changes without writing — the
// preview the client shows before applying. Apply mode writes the asset rows
// plus one assetValuations snapshot each (same shape as PUT /api/assets/[id]).

export const POST = withAuth(async (user, request) => {
  const body = (await request.json().catch(() => ({}))) as { dryRun?: boolean };
  const dryRun = body.dryRun === true;

  // Prices/rates are at most a day old and this shares the daily fetch guard —
  // no extra Navasan budget.
  await ensureFreshRates(process.env.NAVASAN_API_KEY);
  const latest = await getLatestRates();

  const result = await db.execute({
    sql: 'SELECT * FROM assets WHERE userId = ? ORDER BY category, name',
    args: [user.userId],
  });
  const assets = result.rows.map(mapRowToAsset);

  const { changes, skipped } = planRevalue(assets, latest, new Date().toISOString().slice(0, 10));

  if (!dryRun && changes.length > 0) {
    const valuedAt = new Date().toISOString();
    // One atomic batch — a mid-batch failure must not leave half the portfolio
    // revalued at new rates and half at old ones.
    const statements = changes.flatMap((change) => {
      const asset = assets.find((a) => a.id === change.id);
      if (!asset) return [];
      return [
        {
          sql: `UPDATE assets
                SET amount = ?, unitValue = ?, entryRate = ?, lastValuedAt = ?, updatedAt = CURRENT_TIMESTAMP
                WHERE id = ? AND userId = ?`,
          args: [change.next.amount, change.next.unitValue, change.next.entryRate, valuedAt, change.id, user.userId],
        },
        {
          sql: `INSERT INTO assetValuations (assetId, quantity, unitValue, amount, currency, entryRate, valuedAt, source)
                VALUES (?, ?, ?, ?, ?, ?, ?, 'revalue')`,
          args: [
            change.id,
            asset.quantity,
            change.next.unitValue,
            change.next.amount,
            asset.currency,
            change.next.entryRate,
            valuedAt,
          ],
        },
      ];
    });
    await db.batch(statements, 'write');
  }

  return NextResponse.json({ applied: !dryRun, changes, skipped });
}, 'Assets');
