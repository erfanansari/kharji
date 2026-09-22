import { NextResponse } from 'next/server';

import { DEMO_EMAIL } from '@constants';

import { withAuth } from '@core/api/utils';
import { auth } from '@core/auth/auth';
import { db } from '@core/database/client';

export const DELETE = withAuth(async (user, request) => {
  if (user.email === DEMO_EMAIL) {
    return NextResponse.json({ error: "Demo account can't be deleted" }, { status: 403 });
  }

  const userId = user.userId;

  // Revoke the current session and clear the cookie while the session row
  // still exists; the batch below then removes any other sessions.
  await auth.api.signOut({ headers: request.headers });

  // Older tables use user_id, newer ones userId. assetValuations and
  // expense_tags only reference the user indirectly, so they must be
  // deleted before their parent rows.
  await db.batch(
    [
      {
        sql: 'DELETE FROM expense_tags WHERE expense_id IN (SELECT id FROM expenses WHERE user_id = ?)',
        args: [userId],
      },
      { sql: 'DELETE FROM expenses WHERE user_id = ?', args: [userId] },
      { sql: 'DELETE FROM tags WHERE user_id = ?', args: [userId] },
      { sql: 'DELETE FROM categories WHERE user_id = ?', args: [userId] },
      {
        sql: 'DELETE FROM assetValuations WHERE assetId IN (SELECT id FROM assets WHERE userId = ?)',
        args: [userId],
      },
      { sql: 'DELETE FROM assets WHERE userId = ?', args: [userId] },
      { sql: 'DELETE FROM assetTypes WHERE userId = ?', args: [userId] },
      { sql: 'DELETE FROM incomes WHERE userId = ?', args: [userId] },
      { sql: 'DELETE FROM debts WHERE userId = ?', args: [userId] },
      // These four declare ON DELETE CASCADE but `PRAGMA foreign_keys` is OFF
      // per connection and nothing turns it on, so the clause never fires and
      // the rows outlived the account. Recurrence rules in particular kept
      // being scanned by the materializer forever.
      {
        sql: 'DELETE FROM recurringExpenseTags WHERE recurringId IN (SELECT id FROM recurringExpenses WHERE userId = ?)',
        args: [userId],
      },
      { sql: 'DELETE FROM recurringExpenses WHERE userId = ?', args: [userId] },
      { sql: 'DELETE FROM userLocalePreferences WHERE userId = ?', args: [userId] },
      { sql: 'DELETE FROM feedback WHERE userId = ?', args: [userId] },
      { sql: 'DELETE FROM session WHERE userId = ?', args: [userId] },
      { sql: 'DELETE FROM account WHERE userId = ?', args: [userId] },
      { sql: 'DELETE FROM userNotificationPreferences WHERE userId = ?', args: [userId] },
      { sql: 'DELETE FROM sentEmailReports WHERE userId = ?', args: [userId] },
      { sql: 'DELETE FROM userCurrencyPreferences WHERE userId = ?', args: [userId] },
      { sql: 'DELETE FROM users WHERE id = ?', args: [userId] },
    ],
    'write'
  );

  return NextResponse.json({ success: true });
}, 'DeleteAccount');
