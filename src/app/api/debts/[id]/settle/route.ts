import { getTranslations } from 'next-intl/server';
import { NextResponse } from 'next/server';

import { createSettleDebtSchema } from '@schemas';

import { parseIdParam, validateBody, verifyOwnership, withAuth } from '@core/api/utils';
import { buildBalanceStatements, buildReversalStatements } from '@core/database/account-balance';
import { db } from '@core/database/client';
import {
  buildSettleStatement,
  buildUnsettleStatement,
  planSettlement,
  readSettlement,
  SETTLEMENT_ERROR_MESSAGE,
  SETTLEMENT_ERROR_STATUS,
} from '@core/database/debt-settlement';
import type { SettlementPlanErrorReason, SettlementPlanOk } from '@core/database/debt-settlement';

import type { DebtDirection } from '@/@types/debt';

/**
 * Settling is a sub-resource, not a field on PUT.
 *
 * 1. POST /api/assets/revalue is the existing precedent for an action that
 *    plans, moves balances and writes valuation rows — none of which is a
 *    field write.
 * 2. A `settledAt` field on the PUT body would let one request change the
 *    amount AND settle. The applied delta is computed from the amount at
 *    settle time, so the two orderings produce different balances; a dedicated
 *    endpoint makes settling atomic and un-interleavable by construction.
 * 3. It gets its own error surface (404/400/422 out of the planner) instead of
 *    smuggling three failure modes through a generic 400.
 */
export const POST = withAuth(async (user, request, { params }) => {
  const id = await parseIdParam(params);
  if (id instanceof NextResponse) return id;

  const existing = await verifyOwnership('debts', id, user.userId);
  if (existing instanceof NextResponse) return existing;

  // The SQL guard in buildSettleStatement already makes a double-settle a
  // no-op under a race. This 409 is the other half: it makes a double-click
  // legible instead of silently doing nothing.
  if (existing.settledAt !== null && existing.settledAt !== undefined) {
    return NextResponse.json({ error: 'This debt is already settled' }, { status: 409 });
  }

  const raw = await request.json().catch(() => ({}));
  const t = await getTranslations();
  const result = validateBody(createSettleDebtSchema(t), raw);
  if (result instanceof NextResponse) return result;

  const settledAssetId = result.data.settledAssetId ?? null;
  const settledAt = result.data.settledAt ?? new Date().toISOString();

  // No account = bookkeeping only. The default, and what the original report
  // actually asked for: «فقط جهت حساب کتاب».
  let plan: SettlementPlanOk | null = null;
  if (settledAssetId !== null) {
    const planned = await planSettlement({
      userId: user.userId,
      assetId: settledAssetId,
      direction: existing.direction as DebtDirection,
      debt: {
        amount: existing.amount as number,
        currency: existing.currency as string,
        entryRate: existing.entryRate as number,
      },
    });
    if (!planned.ok) {
      const reason: SettlementPlanErrorReason = planned.reason;
      return NextResponse.json(
        { error: SETTLEMENT_ERROR_MESSAGE[reason] },
        { status: SETTLEMENT_ERROR_STATUS[reason] }
      );
    }
    plan = planned;
  }

  const valuedAt = new Date().toISOString();
  const balanceStatements = plan
    ? buildBalanceStatements(
        user.userId,
        [{ assetId: plan.assetId, delta: plan.delta, decimals: plan.decimals, entryRate: plan.rate }],
        valuedAt,
        'debt'
      )
    : [];

  // One batch: the balance moves and the debt is stamped together, so there is
  // no window in which a balance has moved for a debt that still reads as
  // outstanding.
  await db.batch([...balanceStatements, buildSettleStatement(user.userId, id, settledAt, plan)], 'write');

  return NextResponse.json({ message: 'Debt settled successfully' });
}, 'Debts');

/** Un-settle. The precise inverse of the POST, so it shares the route file. */
export const DELETE = withAuth(async (user, _request, { params }) => {
  const id = await parseIdParam(params);
  if (id instanceof NextResponse) return id;

  const existing = await verifyOwnership('debts', id, user.userId);
  if (existing instanceof NextResponse) return existing;

  if (existing.settledAt === null || existing.settledAt === undefined) {
    return NextResponse.json({ error: 'This debt is not settled' }, { status: 409 });
  }

  const valuedAt = new Date().toISOString();
  const reversal = await buildReversalStatements({
    userId: user.userId,
    funding: readSettlement(existing),
    valuedAt,
    source: 'debt',
  });

  await db.batch([...reversal, buildUnsettleStatement(user.userId, id)], 'write');

  return NextResponse.json({ message: 'Settlement reversed' });
}, 'Debts');
