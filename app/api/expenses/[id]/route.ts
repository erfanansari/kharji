import { NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { type CreateExpenseInput } from '@/lib/types/expense';

// PUT /api/expenses/[id] - Update an expense
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Validate ID
    if (!id || isNaN(Number(id))) {
      return NextResponse.json(
        { error: 'Invalid expense ID' },
        { status: 400 }
      );
    }

    const body = await request.json() as CreateExpenseInput;

    // Validate required fields
    if (!body.date || !body.category || !body.description) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Update the expense
    await db.execute({
      sql: `UPDATE expenses
            SET date = ?, category = ?, description = ?, price_toman = ?, price_usd = ?
            WHERE id = ?`,
      args: [
        body.date,
        body.category,
        body.description,
        body.price_toman,
        body.price_usd,
        Number(id)
      ]
    });

    // Update tags - delete existing and insert new ones
    await db.execute({
      sql: 'DELETE FROM expense_tags WHERE expense_id = ?',
      args: [Number(id)]
    });

    if (body.tagIds && body.tagIds.length > 0) {
      for (const tagId of body.tagIds) {
        await db.execute({
          sql: 'INSERT INTO expense_tags (expense_id, tag_id) VALUES (?, ?)',
          args: [Number(id), tagId]
        });
      }
    }

    return NextResponse.json(
      { message: 'Expense updated successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Failed to update expense:', error);
    return NextResponse.json(
      { error: 'Failed to update expense' },
      { status: 500 }
    );
  }
}

// DELETE /api/expenses/[id] - Delete an expense
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Validate ID
    if (!id || isNaN(Number(id))) {
      return NextResponse.json(
        { error: 'Invalid expense ID' },
        { status: 400 }
      );
    }

    // Delete the expense
    await db.execute({
      sql: 'DELETE FROM expenses WHERE id = ?',
      args: [Number(id)]
    });

    return NextResponse.json(
      { message: 'Expense deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Failed to delete expense:', error);
    return NextResponse.json(
      { error: 'Failed to delete expense' },
      { status: 500 }
    );
  }
}
