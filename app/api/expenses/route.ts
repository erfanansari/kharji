import { NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { type CreateExpenseInput, type Expense } from '@/lib/types/expense';

// GET /api/expenses - Fetch all expenses with tags
export async function GET() {
  try {
    const result = await db.execute('SELECT * FROM expenses ORDER BY date DESC, created_at DESC');

    // Fetch tags for all expenses
    const expenseIds = result.rows.map(row => row.id);
    let tagsMap: Record<number, any[]> = {};

    if (expenseIds.length > 0) {
      const placeholders = expenseIds.map(() => '?').join(',');
      const tagsResult = await db.execute({
        sql: `
          SELECT et.expense_id, t.id, t.name, t.created_at
          FROM expense_tags et
          JOIN tags t ON et.tag_id = t.id
          WHERE et.expense_id IN (${placeholders})
        `,
        args: expenseIds
      });

      // Group tags by expense_id
      tagsResult.rows.forEach((row: any) => {
        if (!tagsMap[row.expense_id]) {
          tagsMap[row.expense_id] = [];
        }
        tagsMap[row.expense_id].push({
          id: row.id,
          name: row.name,
          created_at: row.created_at
        });
      });
    }

    const expenses: Expense[] = result.rows.map((row) => ({
      id: row.id as number,
      date: row.date as string,
      category: row.category as string,
      description: row.description as string,
      price_toman: row.price_toman as number,
      price_usd: row.price_usd as number,
      created_at: row.created_at as string,
      tags: tagsMap[row.id as number] || []
    }));

    return NextResponse.json(expenses);
  } catch (error) {
    console.error('Failed to fetch expenses:', error);
    return NextResponse.json(
      { error: 'Failed to fetch expenses' },
      { status: 500 }
    );
  }
}

// POST /api/expenses - Create a new expense
export async function POST(request: Request) {
  try {
    const body: CreateExpenseInput = await request.json();

    // Validate required fields
    if (!body.date || !body.category || !body.description || body.price_toman === undefined || body.price_usd === undefined) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    // Validate numbers
    if (typeof body.price_toman !== 'number' || typeof body.price_usd !== 'number') {
      return NextResponse.json(
        { error: 'Prices must be numbers' },
        { status: 400 }
      );
    }

    // Insert the expense
    const expenseResult = await db.execute({
      sql: 'INSERT INTO expenses (date, category, description, price_toman, price_usd) VALUES (?, ?, ?, ?, ?) RETURNING id',
      args: [body.date, body.category, body.description, body.price_toman, body.price_usd]
    });

    const expenseId = expenseResult.rows[0].id as number;

    // Insert tags if provided
    if (body.tagIds && body.tagIds.length > 0) {
      for (const tagId of body.tagIds) {
        await db.execute({
          sql: 'INSERT INTO expense_tags (expense_id, tag_id) VALUES (?, ?)',
          args: [expenseId, tagId]
        });
      }
    }

    return NextResponse.json(
      { message: 'Expense created successfully', id: expenseId },
      { status: 201 }
    );
  } catch (error) {
    console.error('Failed to create expense:', error);
    return NextResponse.json(
      { error: 'Failed to create expense' },
      { status: 500 }
    );
  }
}
