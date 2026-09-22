import { getTranslations } from 'next-intl/server';
import { NextResponse } from 'next/server';

import { createDebtSchema } from '@schemas';

import { parseIdParam, validateBody, verifyOwnership, withAuth } from '@core/api/utils';
import { buildResyncStatements, buildReversalStatements } from '@core/database/account-balance';
import { db } from '@core/database/client';
import {
  fetchSettledFromForDebts,
  planSettlement,
  readSettlement,
  SETTLEMENT_ERROR_MESSAGE,
  SETTLEMENT_ERROR_STATUS,
} from '@core/database/debt-settlement';
import type { SettlementPlanErrorReason, SettlementPlanOk } from '@core/database/debt-settlement';
import { mapRowToDebt } from '@core/database/mappers';
import { getEntryRateOn } from '@core/rates';

export const GET = withAuth(async (user, _request, { params }) => {
  const id = await parseIdParam(params);
  if (id instanceof NextResponse) return id;

  const existing = await verifyOwnership('debts', id, user.userId);
  if (existing instanceof NextResponse) return existing;

  const settledFrom = await fetchSettledFromForDebts([id]);
  return NextResponse.json(mapRowToDebt(existing, settledFrom[id]));
}, 'Debts');

export const PUT = withAuth(async (user, request, { params }) => {
  const id = await parseIdParam(params);
  if (id instanceof NextResponse) return id;

  const existing = await verifyOwnership('debts', id, user.userId);
  if (existing instanceof NextResponse) return existing;

  const raw = await request.json();
  const t = await getTranslations();
  // Full body, not `.partial()` — the form always submits everything, and the
  // settlement columns are deliberately ABSENT from this schema, so zod strips
  // them. Settling is POST /api/debts/[id]/settle and nothing else; letting a
  // PUT set settledAt would make "change the amount AND settle" one request,
  // and the applied delta depends on which of those happened first.
  const result = validateBody(createDebtSchema(t), raw);
  if (result instanceof NextResponse) return result;

  const body = result.data;

  const entryRate = await getEntryRateOn(body.currency, body.incurredAt);
  if (entryRate === null) {
    return NextResponse.json({ error: `No exchange rate available for ${body.currency}` }, { status: 422 });
  }

  // An unsettled debt moves no balance, so editing one emits zero balance
  // statements. A settled one has to re-plan against the account it settled
  // through, because the amount or currency it moved may have just changed.
  const before = readSettlement(existing);
  let after: SettlementPlanOk | null = null;

  if (before !== null) {
    const plan = await planSettlement({
      userId: user.userId,
      assetId: before.assetId,
      direction: body.direction,
      debt: { amount: body.amount, currency: body.currency, entryRate },
    });
    if (!plan.ok) {
      const reason: SettlementPlanErrorReason = plan.reason;
      return NextResponse.json(
        { error: SETTLEMENT_ERROR_MESSAGE[reason] },
        { status: SETTLEMENT_ERROR_STATUS[reason] }
      );
    }
    after = plan;
  }

  const valuedAt = new Date().toISOString();
  // `resyncOps` is sign-agnostic, which is what makes the awkward case correct
  // for free: flipping a SETTLED debt from payable to receivable yields
  // `after.delta - before.delta = -d - d = -2d` against the same account —
  // it gives back what was paid AND credits what is now received.
  const balanceStatements = await buildResyncStatements({
    userId: user.userId,
    before,
    after: after ? { assetId: after.assetId, delta: after.delta, currency: after.currency } : null,
    valuedAt,
    source: 'debt',
  });

  await db.batch(
    [
      {
        sql: `UPDATE debts
                 SET direction = ?, counterparty = ?, amount = ?, currency = ?, entryRate = ?,
                     incurredAt = ?, dueDate = ?, note = ?,
                     settledDelta = ?, settledCurrency = ?,
                     updatedAt = CURRENT_TIMESTAMP
               WHERE id = ? AND userId = ?`,
        args: [
          body.direction,
          body.counterparty,
          body.amount,
          body.currency,
          entryRate,
          body.incurredAt,
          body.dueDate ?? null,
          body.note ?? null,
          after ? after.delta : null,
          after ? after.currency : null,
          id,
          user.userId,
        ],
      },
      ...balanceStatements,
    ],
    'write'
  );

  return NextResponse.json({ message: 'Debt updated successfully' });
}, 'Debts');

export const DELETE = withAuth(async (user, _request, { params }) => {
  const id = await parseIdParam(params);
  if (id instanceof NextResponse) return id;

  // Read the row first: it is the only record of how much was moved and in
  // which currency, and it is about to stop existing.
  const existing = await verifyOwnership('debts', id, user.userId);
  if (existing instanceof NextResponse) return existing;

  const valuedAt = new Date().toISOString();
  const reversal = await buildReversalStatements({
    userId: user.userId,
    funding: readSettlement(existing),
    valuedAt,
    source: 'debt',
  });

  await db.batch(
    [...reversal, { sql: 'DELETE FROM debts WHERE id = ? AND userId = ?', args: [id, user.userId] }],
    'write'
  );

  return NextResponse.json({ message: 'Debt deleted successfully' });
}, 'Debts');
