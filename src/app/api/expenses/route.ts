import { getTranslations } from 'next-intl/server';
import { NextResponse } from 'next/server';

import { createExpenseSchema } from '@schemas';

import { getSearchParams, validateBody, verifyOwnership, withAuth } from '@core/api/utils';
import { fetchCategoriesForExpenses } from '@core/database/categories';
import { db } from '@core/database/client';
import {
  applyFundingToExpense,
  fetchPaidFromForExpenses,
  FUNDING_ERROR_MESSAGE,
  FUNDING_ERROR_STATUS,
  planFunding,
} from '@core/database/expense-funding';
import type { FundingPlanErrorReason } from '@core/database/expense-funding';
import { fetchRepeatsForExpenses, syncExpenseRepeat } from '@core/database/expense-repeat';
import { mapRowToExpense } from '@core/database/mappers';
import { assignTagsToExpense, fetchTagsForExpenses } from '@core/database/tags';
import { getEntryRate } from '@core/rates';
import { materializeDueExpensesSafely } from '@core/recurring/materialize';

// GET /api/expenses - Fetch expenses with pagination support
// Query parameters:
//   - limit: number of expenses to fetch (default: all expenses, for backward compatibility)
//   - cursor: pagination cursor in format "date:created_at:id" (optional)
//   - categoryId: filter by category id
// If limit is not provided, returns all expenses in the old format (backward compatible)
// If limit is provided, returns paginated format: { expenses, nextCursor, hasMore }
export const GET = withAuth(async (user, request) => {
  // Post anything a recurring rule owes before reading, so a user who opens the
  // app ahead of the daily cron still sees today's rent. No-op (one indexed
  // query) when nothing is due, and never throws — see materializeDueExpensesSafely.
  await materializeDueExpensesSafely(user.userId);

  const searchParams = getSearchParams(request);
  const limitParam = searchParams.get('limit');
  const cursor = searchParams.get('cursor');
  const description = searchParams.get('description')?.trim() || null;
  const categoryIdParam = searchParams.get('categoryId')?.trim() || null;
  const categoryId = categoryIdParam ? Number(categoryIdParam) : null;
  const dateFrom = searchParams.get('dateFrom')?.trim() || null;
  const dateTo = searchParams.get('dateTo')?.trim() || null;
  const tagIdsParam = searchParams.get('tagIds')?.trim() || null;
  const tagIds = tagIdsParam ? tagIdsParam.split(',').map(Number).filter(Boolean) : [];

  // Backward compatibility: if no limit is specified, return all expenses
  if (!limitParam || limitParam === '') {
    const result = await db.execute({
      sql: 'SELECT * FROM expenses WHERE user_id = ? ORDER BY date DESC, created_at DESC',
      args: [user.userId],
    });

    const ids = result.rows.map((row) => row.id);
    const [tagsMap, categoriesMap, repeatsMap, paidFromMap] = await Promise.all([
      fetchTagsForExpenses(ids),
      fetchCategoriesForExpenses(ids),
      fetchRepeatsForExpenses(ids),
      fetchPaidFromForExpenses(ids),
    ]);
    const expenses = result.rows
      .map((row) => {
        const cat = categoriesMap[row.id as number];
        if (!cat) return null;
        return mapRowToExpense(
          row,
          cat,
          tagsMap[row.id as number],
          repeatsMap[row.id as number],
          paidFromMap[row.id as number]
        );
      })
      .filter((e): e is NonNullable<typeof e> => e !== null);

    return NextResponse.json(expenses);
  }

  // Paginated response
  const limit = Math.min(parseInt(limitParam, 10), 100); // Max 100 items per request

  let whereSql = ' WHERE user_id = ?';
  const filterArgs: (string | number)[] = [user.userId];

  if (description) {
    whereSql += ' AND description LIKE ?';
    filterArgs.push(`%${description}%`);
  }
  if (categoryId) {
    whereSql += ' AND category_id = ?';
    filterArgs.push(categoryId);
  }
  if (dateFrom) {
    whereSql += ' AND date >= ?';
    filterArgs.push(dateFrom);
  }
  if (dateTo) {
    whereSql += ' AND date <= ?';
    filterArgs.push(dateTo);
  }
  if (tagIds.length > 0) {
    whereSql += ` AND EXISTS (SELECT 1 FROM expense_tags et WHERE et.expense_id = expenses.id AND et.tag_id IN (${tagIds.map(() => '?').join(',')}))`;
    filterArgs.push(...tagIds);
  }

  let sql = `SELECT * FROM expenses${whereSql}`;
  const args = [...filterArgs];

  if (cursor) {
    const [cursorDate, cursorCreatedAt, cursorId] = cursor.split(':');
    sql += ` AND (date < ? OR (date = ? AND created_at < ?) OR (date = ? AND created_at = ? AND id < ?))`;
    args.push(cursorDate, cursorDate, cursorCreatedAt, cursorDate, cursorCreatedAt, parseInt(cursorId, 10));
  }

  sql += ' ORDER BY date DESC, created_at DESC, id DESC LIMIT ?';
  args.push(limit + 1);

  const summarySql = `
    SELECT date, currency, entryRate, SUM(amount) AS amount, COUNT(*) AS count
    FROM expenses${whereSql}
    GROUP BY date, currency, entryRate
  `;

  // Infinite-query pages after the first reuse the first page's summary. Do
  // not resend the aggregate groups with every 20-row page.
  const [result, summaryResult] = await Promise.all([
    db.execute({ sql, args }),
    cursor ? Promise.resolve(null) : db.execute({ sql: summarySql, args: filterArgs }),
  ]);

  const hasMore = result.rows.length > limit;
  const expensesToReturn = hasMore ? result.rows.slice(0, limit) : result.rows;

  const ids = expensesToReturn.map((row) => row.id);
  const [tagsMap, categoriesMap, repeatsMap, paidFromMap] = await Promise.all([
    fetchTagsForExpenses(ids),
    fetchCategoriesForExpenses(ids),
    fetchRepeatsForExpenses(ids),
    fetchPaidFromForExpenses(ids),
  ]);
  const expenses = expensesToReturn
    .map((row) => {
      const cat = categoriesMap[row.id as number];
      if (!cat) return null;
      return mapRowToExpense(
        row,
        cat,
        tagsMap[row.id as number],
        repeatsMap[row.id as number],
        paidFromMap[row.id as number]
      );
    })
    .filter((e): e is NonNullable<typeof e> => e !== null);

  let nextCursor: string | null = null;
  if (hasMore && expenses.length > 0) {
    const lastExpense = expenses[expenses.length - 1];
    nextCursor = `${lastExpense.date}:${lastExpense.created_at}:${lastExpense.id}`;
  }

  return NextResponse.json({
    expenses,
    nextCursor,
    hasMore,
    summary: summaryResult
      ? {
          count: summaryResult.rows.reduce((total, row) => total + Number(row.count), 0),
          items: summaryResult.rows.map((row) => ({
            amount: Number(row.amount),
            currency: String(row.currency),
            date: String(row.date),
            entryRate: Number(row.entryRate),
          })),
        }
      : null,
  });
}, 'Expenses');

// POST /api/expenses - Create a new expense
export const POST = withAuth(async (user, request) => {
  const raw = await request.json();
  const t = await getTranslations();
  const result = validateBody(createExpenseSchema(t), raw);
  if (result instanceof NextResponse) return result;

  const body = result.data;

  // Verify the category belongs to this user
  const category = await verifyOwnership('categories', body.categoryId, user.userId, 'user_id');
  if (category instanceof NextResponse) return category;

  // Snapshot the rate to the pivot at entry time so the value stays historically exact.
  const entryRate = await getEntryRate(body.currency);
  if (entryRate === null) {
    return NextResponse.json({ error: `No exchange rate available for ${body.currency}` }, { status: 422 });
  }

  // Plan the deduction *before* inserting, so an unusable account can never
  // leave a half-created expense behind.
  const paidFromAssetId = body.paidFromAssetId ?? null;
  const plan =
    paidFromAssetId !== null
      ? await planFunding({
          userId: user.userId,
          assetId: paidFromAssetId,
          expense: { amount: body.amount, currency: body.currency, entryRate },
        })
      : null;

  if (plan && !plan.ok) {
    const reason: FundingPlanErrorReason = plan.reason;
    return NextResponse.json({ error: FUNDING_ERROR_MESSAGE[reason] }, { status: FUNDING_ERROR_STATUS[reason] });
  }

  const expenseResult = await db.execute({
    sql: 'INSERT INTO expenses (user_id, date, category_id, description, amount, currency, entryRate, paidFromAssetId) VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING id',
    args: [
      user.userId,
      body.date,
      body.categoryId,
      body.description,
      body.amount,
      body.currency,
      entryRate,
      paidFromAssetId,
    ],
  });

  const expenseId = expenseResult.rows[0].id as number;

  // Second phase: move the balance and stamp the applied delta back onto the
  // expense. Until this lands the row reads "account chosen, nothing applied",
  // which is safe and self-repairs on the next edit.
  if (plan?.ok) {
    await applyFundingToExpense({
      userId: user.userId,
      expenseId,
      assetId: plan.assetId,
      expense: { amount: body.amount, currency: body.currency, entryRate },
    });
  }

  await assignTagsToExpense(expenseId, body.tagIds);

  // A repeat is saved as part of the expense, never managed on its own. The
  // expense just created is occurrence #0, so the rule resumes from #1.
  await syncExpenseRepeat({
    userId: user.userId,
    expenseId,
    date: body.date,
    categoryId: body.categoryId,
    description: body.description,
    amount: body.amount,
    currency: body.currency,
    tagIds: body.tagIds,
    repeat: body.repeat,
    paidFromAssetId,
    existingRecurringId: null,
  });

  return NextResponse.json({ message: 'Expense created successfully', id: expenseId }, { status: 201 });
}, 'Expenses');
